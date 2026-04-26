import logging,os
import logging.config

log_directory = 'C:/Users/Public/webapps_logs/'
os.makedirs(log_directory, exist_ok=True)
    
file_dir_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
parent_dir = os.path.abspath(os.path.join(file_dir_path, '..'))

conf_path = parent_dir+os.sep+"logging.conf"
logging.config.fileConfig(conf_path)

# Create logger
logger = logging.getLogger('tc')


