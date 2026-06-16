import asyncio

from app.registrars.cameo import (
    CameoRegistrarClient,
)


async def main():

    client = CameoRegistrarClient()

    try:

        result = await client.fetch_allotment(
            ipo_code="ICF",
            pan="GTPPR4400D",
        )

        print(result)

    finally:

        await client.close()


if __name__ == "__main__":
    asyncio.run(main())