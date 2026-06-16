from abc import ABC, abstractmethod


class RegistrarClient(ABC):

    @abstractmethod
    async def fetch_allotment(
        self,
        ipo_code: str,
        pan: str,
    ):
        raise NotImplementedError