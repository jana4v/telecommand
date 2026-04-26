from multiprocessing import freeze_support
import os, sys

if __name__ == "__main__":
    path = os.path.dirname(os.path.abspath(__file__))
    if path not in sys.path:
        sys.path.append(path)
    if path.find("lib") != -1:
        # get parent directory of lib directory
        lib_index = path.split(os.sep).index("lib")
        parent_path = os.sep.join(path.split(os.sep)[:lib_index]) 
        os.chdir(parent_path)
    else:
        os.chdir(path)    
 
from src.RestApi import run_rest_api


if __name__ == '__main__':
    freeze_support()
    run_rest_api()

