from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class CaseSourceAdapter(ABC):
    """
    Abstract adapter interface for complaint intake sources.
    Future live integrations (e.g., AICTE portal API, PGRC intake webhook)
    implement this contract without modifying domain case logic.
    """
    @abstractmethod
    def fetch_cases(self, cursor: Optional[str] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def normalize_record(self, raw_record: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        pass
