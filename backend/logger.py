"""
Centralized logging configuration for SeatHarmony backend.
Provides structured logging with request context, colorized output, and file rotation.
"""

import logging
import sys
import os
import uuid
from datetime import datetime
from pathlib import Path
from logging.handlers import RotatingFileHandler
from typing import Optional
from contextvars import ContextVar

# Context variable for request ID tracking across async/threaded operations
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)


def get_request_id() -> str:
    """Get the current request ID or generate a new one."""
    req_id = request_id_var.get()
    if req_id is None:
        req_id = uuid.uuid4().hex[:8]
        request_id_var.set(req_id)
    return req_id


def set_request_id(req_id: Optional[str] = None) -> str:
    """Set a new request ID for the current context."""
    if req_id is None:
        req_id = uuid.uuid4().hex[:8]
    request_id_var.set(req_id)
    return req_id


class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors for different log levels."""

    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
    }
    RESET = '\033[0m'
    BOLD = '\033[1m'

    def format(self, record):
        # Add request ID to record
        record.request_id = request_id_var.get() or '-'

        # Format the message
        log_message = super().format(record)

        # Apply color based on level
        if record.levelname in self.COLORS:
            color = self.COLORS[record.levelname]
            log_message = f"{color}{log_message}{self.RESET}"

        return log_message


class PlainFormatter(logging.Formatter):
    """Plain formatter for file output without colors."""

    def format(self, record):
        # Add request ID to record
        record.request_id = request_id_var.get() or '-'
        return super().format(record)


def setup_logging(
    level: str = "INFO",
    log_dir: Optional[str] = None,
    enable_file_logging: bool = True,
    max_file_size_mb: int = 10,
    backup_count: int = 5,
) -> logging.Logger:
    """
    Set up the SeatHarmony logger with console and optional file output.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory for log files (default: backend/logs)
        enable_file_logging: Whether to write logs to files
        max_file_size_mb: Maximum size of each log file in MB
        backup_count: Number of backup files to keep

    Returns:
        Configured logger instance
    """
    # Get or create the main logger
    logger = logging.getLogger("seatharmony")

    # Only configure if not already configured
    if logger.handlers:
        return logger

    # Set level from environment or parameter
    log_level = os.getenv("LOG_LEVEL", level).upper()
    logger.setLevel(getattr(logging, log_level, logging.INFO))

    # Console handler with colors
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_format = "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s | [%(request_id)s] %(message)s"
    console_handler.setFormatter(ColoredFormatter(console_format, datefmt="%H:%M:%S"))
    logger.addHandler(console_handler)

    # File handler (optional)
    if enable_file_logging:
        if log_dir is None:
            log_dir = Path(__file__).parent / "logs"
        else:
            log_dir = Path(log_dir)

        log_dir.mkdir(exist_ok=True)

        # Main log file with rotation
        log_file = log_dir / "seatharmony.log"
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_file_size_mb * 1024 * 1024,
            backupCount=backup_count,
        )
        file_handler.setLevel(logging.DEBUG)
        file_format = "%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | [%(request_id)s] %(message)s"
        file_handler.setFormatter(PlainFormatter(file_format, datefmt="%Y-%m-%d %H:%M:%S"))
        logger.addHandler(file_handler)

        # Separate error log
        error_file = log_dir / "seatharmony_errors.log"
        error_handler = RotatingFileHandler(
            error_file,
            maxBytes=max_file_size_mb * 1024 * 1024,
            backupCount=backup_count,
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(PlainFormatter(file_format, datefmt="%Y-%m-%d %H:%M:%S"))
        logger.addHandler(error_handler)

    # Prevent propagation to root logger
    logger.propagate = False

    return logger


def get_logger(name: str = "seatharmony") -> logging.Logger:
    """
    Get a child logger for a specific module.

    Args:
        name: Module name (will be appended to 'seatharmony')

    Returns:
        Logger instance
    """
    if name == "seatharmony":
        return logging.getLogger("seatharmony")
    return logging.getLogger(f"seatharmony.{name}")


# Module-level helper functions for common logging patterns
def log_function_entry(logger: logging.Logger, **kwargs):
    """Log function entry with parameters."""
    params = ", ".join(f"{k}={v}" for k, v in kwargs.items())
    logger.debug(f"ENTER | {params}")


def log_function_exit(logger: logging.Logger, result=None, duration_ms: float = None):
    """Log function exit with optional result and duration."""
    parts = ["EXIT"]
    if duration_ms is not None:
        parts.append(f"duration={duration_ms:.2f}ms")
    if result is not None:
        result_str = str(result)[:100]  # Truncate long results
        parts.append(f"result={result_str}")
    logger.debug(" | ".join(parts))


def log_error(logger: logging.Logger, error: Exception, context: str = ""):
    """Log an error with full context."""
    import traceback
    tb = traceback.format_exc()
    logger.error(f"ERROR | {context} | {type(error).__name__}: {error}\n{tb}")


# Initialize the main logger on module import
_main_logger = setup_logging()
