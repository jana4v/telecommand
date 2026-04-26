import importlib, os,sys
from typing import Dict
from src.Models import TcDetailsTblRow,TcRequest, TestProcedure
from src.GenerateProcedure.plugins.BaseClass import ProcedureBase
from src.Logging.Logger import logger

class PluginsFactory:
    def __init__(self):
        self._creators = {}

    def register_component(self, command_format, class_ref):
        if self.get_component(command_format) is None:
            self._creators[command_format] = class_ref()
            logger.info(f"""Component for Command Format:{command_format} got Registered.""")

    def get_component(self, command_format):
        #print(f"Getting component Command Format:{command_format}")
        try:
            creator = self._creators.get(command_format)
            if not creator:
                return None
            return creator
        except AttributeError as ae:
            return None


plugins_factory = PluginsFactory()

# following code imports all components
# destination_dir = os.path.dirname(os.path.realpath(__file__))
# for root, subFolder, files in os.walk(destination_dir):
#     if root.find("__pycache__") != -1:
#         continue
#     for file in files:
#         if file.find("procedure_") == 0:
#             _system = os.path.split(root)[1]
#             package_name = __name__.split(".")[:-1]
#             package_name.append(_system)
#             package_name = ".".join(package_name)
#             # print(file[:-3],package_name,root, subFolder)
#             importlib.import_module("." + file[:-3], package=package_name)


if getattr(sys, 'frozen', False):
    # If the application is frozen, use sys._MEIPASS
    destination_dir = os.path.dirname(sys.executable)
    root_package = ""
else:
    destination_dir = os.path.dirname(os.path.abspath(__file__))
    root_package = "src.GenerateProcedure.plugins"
logger.info(destination_dir)
# Assuming this script is located in src/GenerateProcedure/plugins/Procedures/nvs/Factory.py
#destination_dir = os.path.dirname(os.path.realpath(__file__))


for root, sub_folders, files in os.walk(destination_dir):
    if "__pycache__" in root:
        continue

    for file in files:
        if file.startswith("procedure_") and (file.endswith(".py") or file.endswith(".pyc")):
            if file.endswith(".pyc"):
                module_name = file[:-4]  # Remove the .pyc extension
            else:
                module_name = file[:-3]  # Remove the .py extension
           
            relative_path = os.path.relpath(root, destination_dir)
            # Form the package name dynamically
            if relative_path == '.':
                package_name = root_package
            else:
                package_name = ".".join([root_package] + relative_path.split(os.sep))

            logger.info(f"Importing module {module_name} from package {package_name}")
            try:
                importlib.import_module(f".{module_name}", package=package_name)
            except ModuleNotFoundError as e:
                logger.error(f"Error importing module {module_name} from package {package_name}: {e}")

class ProceduresAPi:
    @classmethod
    async def get_procedure(cls, row: TcDetailsTblRow,tc_request:TcRequest, is_start: bool,r) -> TestProcedure:
        api: ProcedureBase = plugins_factory.get_component(row.CMD_FORMAT)
        if api is not None:
            return await api.get_procedure(row,tc_request,is_start,r)
        
