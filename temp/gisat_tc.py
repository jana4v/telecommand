from multiprocessing import freeze_support
import os, sys
import os,sys
if __name__ == "__main__":
    path = os.path.dirname(__file__)+os.sep+"src"
    if path not in sys.path:
        sys.path.append(path)
from src.RestApi import run_rest_api


if __name__ == '__main__':
    freeze_support()
    run_rest_api()

