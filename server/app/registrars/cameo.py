from __future__ import annotations

import logging
import re
from pathlib import Path

import cv2
import httpx
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
from bs4 import BeautifulSoup

from app.registrars.base import RegistrarClient

logger = logging.getLogger(__name__)


class CameoRegistrarClient(RegistrarClient):
    BASE_URL = "https://ipostatus1.cameoindia.com/"
    CAPTCHA_URL = "https://ipostatus1.cameoindia.com/GenerateCaptcha.aspx"

    # How many times to retry a wrong captcha before giving up on this attempt.
    # (The worker handles outer retry / backoff via the queue.)
    MAX_CAPTCHA_ATTEMPTS = 3

    def __init__(self):
        self.client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=30,
        )
        self.hidden_fields: dict[str, str] = {}

    # ------------------------------------------------------------------ #
    # Page initialisation — reads ASP.NET hidden ViewState fields
    # ------------------------------------------------------------------ #

    async def initialize(self) -> dict[str, str]:
        """GET the main page and scrape __VIEWSTATE / __EVENTVALIDATION."""
        response = await self.client.get(self.BASE_URL)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Reset each time so stale state doesn't carry over
        self.hidden_fields = {}
        for hidden in soup.select("input[type='hidden']"):
            name = hidden.get("name")
            value = hidden.get("value", "")
            if name:
                self.hidden_fields[name] = value

        logger.debug("Scraped %d hidden fields from form.", len(self.hidden_fields))
        return self.hidden_fields

    async def get_ipo_options(self) -> list[dict[str, str]]:
        """
        Lightweight scrape — fetches ONLY the IPO dropdown options.
        Does NOT touch ViewState or captcha.
        Returns [{"name": "ICL FINCORP LIMITED", "value": "ICF"}, ...]
        (the placeholder "0" option is excluded).
        """
        response = await self.client.get(self.BASE_URL)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        company_select = soup.find("select", {"name": "drpCompany"})
        if not company_select:
            raise RuntimeError("Could not find company dropdown on registrar page")

        options = []
        for option in company_select.find_all("option"):
            value = option.get("value", "").strip()
            name = option.text.strip()
            # Skip the placeholder "select company" option
            if value and value != "0":
                options.append({"name": name, "value": value})

        logger.info("Scraped %d IPO options from registrar.", len(options))
        return options

    # ------------------------------------------------------------------ #
    # Captcha download + solve
    # ------------------------------------------------------------------ #

    async def download_captcha(self, save_path: str = "captcha.jpg") -> str:
        response = await self.client.get(self.CAPTCHA_URL)
        response.raise_for_status()
        Path(save_path).write_bytes(response.content)
        return save_path

    def _preprocess_for_ocr(self, image_path: str) -> np.ndarray:
        """
        Multi-step image preprocessing to clean a typical CAPTCHA before OCR:
          1. Load via OpenCV (BGR)
          2. Convert to greyscale
          3. Upscale 2× (Tesseract is more accurate on larger images)
          4. Apply bilateral filter — removes noise while keeping sharp edges
          5. Adaptive threshold → clean black-on-white binary image
          6. Dilate slightly to connect broken character strokes
        """
        img_bgr = cv2.imread(image_path)
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        # 2× upscale — sharper letters for Tesseract
        h, w = gray.shape
        gray = cv2.resize(gray, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)

        # Denoise without blurring edges
        denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

        # Adaptive threshold: handles uneven backgrounds / gradients
        binary = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=11,
            C=4,
        )

        # Light dilation to reconnect broken stroke segments
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        binary = cv2.dilate(binary, kernel, iterations=1)

        return binary

    def solve_captcha(self, image_path: str) -> str:
        """
        Run Tesseract on the preprocessed image.
        Config:
          --psm 8  = single word (the CAPTCHA is one token)
          --oem 3  = use LSTM neural net engine (most accurate)
          -c tessedit_char_whitelist = only digits + upper-case letters
             (CAPTCHAs never use lower-case or punctuation)
        """
        processed = self._preprocess_for_ocr(image_path)

        config = (
            "--psm 8 "
            "--oem 3 "
            "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        )
        text = pytesseract.image_to_string(processed, config=config)

        # Strip any whitespace / stray chars Tesseract sometimes adds
        text = re.sub(r"[^A-Z0-9]", "", text.upper())

        logger.debug("Captcha OCR raw result: %r → cleaned: %r", text, text)
        return text

    # ------------------------------------------------------------------ #
    # Form submission
    # ------------------------------------------------------------------ #

    async def submit_form(
        self,
        ipo_code: str,
        pan: str,
        captcha: str,
    ) -> str:
        if not self.hidden_fields.get("__VIEWSTATE"):
            raise RuntimeError(
                "Form not initialised — call initialize() before submit_form()."
            )

        payload = {
            "__VIEWSTATE": self.hidden_fields["__VIEWSTATE"],
            "__VIEWSTATEGENERATOR": self.hidden_fields["__VIEWSTATEGENERATOR"],
            "__EVENTVALIDATION": self.hidden_fields["__EVENTVALIDATION"],
            "drpCompany": ipo_code,
            "ddlUserTypes": "PAN NO",
            "txtfolio": pan,
            "txt_phy_captcha": captcha,
            "btngenerate": "Submit",
        }

        response = await self.client.post(self.BASE_URL, data=payload)
        logger.debug("POST %s → HTTP %d", self.BASE_URL, response.status_code)

        if response.status_code == 500:
            # ASP.NET 500 almost always means wrong captcha —
            # raise so the caller can retry with a fresh captcha.
            raise CaptchaError(
                f"Registrar returned HTTP 500 — captcha likely incorrect "
                f"(solved as: {captcha!r})"
            )

        response.raise_for_status()
        return response.text

    # ------------------------------------------------------------------ #
    # Result parsing
    # ------------------------------------------------------------------ #

    def parse_result(self, html: str) -> dict:
        soup = BeautifulSoup(html, "html.parser")

        # Detect ASP.NET error page — these always contain this title
        if soup.find("title") and "Runtime Error" in (soup.find("title").text or ""):
            return {
                "status": "ERROR",
                "message": "Registrar returned a runtime error page (captcha mismatch?)",
            }

        table = soup.find("table")
        if not table:
            return {
                "status": "ERROR",
                "message": "No result table in response",
            }

        text = table.get_text(" ", strip=True)

        if "NO DATA FOUND" in text.upper():
            return {"status": "NOT_APPLIED"}

        # Sanity-check: the result table should contain "APPLICATION" or "ALLOT"
        if "APPLI" not in text.upper() and "ALLOT" not in text.upper():
            return {
                "status": "ERROR",
                "message": f"Unrecognised table content: {text[:120]}",
            }

        # Extract allotted shares count to distinguish Allotted (>0) vs Not-Allotted (0)
        alloted_shares = None
        try:
            headers = [th.text.strip().upper() for th in table.find_all("th")]
            target_col = None
            for i, h in enumerate(headers):
                if "ALLOT" in h:
                    target_col = i
                    break

            if target_col is not None:
                tbody = table.find("tbody")
                rows = tbody.find_all("tr") if tbody else table.find_all("tr")
                data_rows = []
                for r in rows:
                    if not r.find("th") and r.find_all("td"):
                        data_rows.append(r)
                if data_rows:
                    cells = data_rows[0].find_all("td")
                    if len(cells) > target_col:
                        shares_text = cells[target_col].text.strip()
                        alloted_shares = int(shares_text)
        except Exception as exc:
            logger.debug("Failed to parse allotted shares from HTML table: %s", exc)

        if alloted_shares is not None:
            if alloted_shares == 0:
                return {"status": "NOT_ALLOTTED", "alloted_shares": 0}
            else:
                return {"status": "ALLOTTED", "alloted_shares": alloted_shares}

        return {"status": "FOUND", "raw": text}


    # ------------------------------------------------------------------ #
    # High-level entry point (with captcha retry loop)
    # ------------------------------------------------------------------ #

    async def fetch_allotment(self, ipo_code: str, pan: str) -> dict:
        """
        Full flow with an inner captcha retry loop.
        Will attempt up to MAX_CAPTCHA_ATTEMPTS fresh captchas before
        raising CaptchaError so the queue worker can apply its outer retry.
        """
        await self.initialize()

        last_exc: Exception | None = None

        for attempt in range(1, self.MAX_CAPTCHA_ATTEMPTS + 1):
            captcha_path = await self.download_captcha(
                save_path=f"captcha_attempt_{attempt}.jpg"
            )
            try:
                captcha_text = self.solve_captcha(captcha_path)

                if not captcha_text:
                    logger.warning(
                        "Captcha attempt %d/%d: OCR returned empty string — retrying.",
                        attempt, self.MAX_CAPTCHA_ATTEMPTS,
                    )
                    last_exc = CaptchaError("OCR returned empty string")
                    continue

                logger.info(
                    "Captcha attempt %d/%d: solved as %r — submitting form.",
                    attempt, self.MAX_CAPTCHA_ATTEMPTS, captcha_text,
                )

                # Re-initialise ViewState on every attempt so the hidden
                # fields stay in sync with the server session.
                if attempt > 1:
                    await self.initialize()

                html = await self.submit_form(
                    ipo_code=ipo_code,
                    pan=pan,
                    captcha=captcha_text,
                )
                return self.parse_result(html)

            except CaptchaError as exc:
                logger.warning(
                    "Captcha attempt %d/%d failed: %s",
                    attempt, self.MAX_CAPTCHA_ATTEMPTS, exc,
                )
                last_exc = exc

            finally:
                Path(captcha_path).unlink(missing_ok=True)

        raise CaptchaError(
            f"All {self.MAX_CAPTCHA_ATTEMPTS} captcha attempts failed for "
            f"ipo={ipo_code} pan={pan}"
        ) from last_exc

    async def close(self) -> None:
        await self.client.aclose()


class CaptchaError(RuntimeError):
    """Raised when all captcha solving attempts are exhausted."""