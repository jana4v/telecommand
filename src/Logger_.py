import logging,os
from logging.handlers import RotatingFileHandler

"""
CRITICAL = 50
FATAL = CRITICAL
ERROR = 40
WARNING = 30
WARN = WARNING
INFO = 20
DEBUG = 10
NOTSET = 0
"""
log_format = "%(asctime)s %(levelname)s %(name)s:%(funcName)s(%(lineno)d): %(message)s"


class LoggingHandler(logging.StreamHandler):
    def __init__(self):
        logging.StreamHandler.__init__(self)

    def emit(self, record):
        try:
            print(record.message)
        except Exception as e:
            print(str(e))


def get_logger(app,path = "C:/Users/Public/webapps_logs"):
    os.makedirs(path, exist_ok=True)
    logger = logging.getLogger(app)
    file_name = path + "/" + app + ".log"
    handler = RotatingFileHandler(file_name, maxBytes=10 ** 8, backupCount=5)
    handler.setFormatter(logging.Formatter(log_format))
    logger.addHandler(handler)
    log_handler = LoggingHandler()
    log_handler.setLevel(logging.DEBUG)
    logger.addHandler(log_handler)
    logger.setLevel(logging.DEBUG)
    return logger

logger = get_logger("TelecommandSoftware")






