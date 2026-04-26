import os,importlib
destination_dir = os.path.dirname(os.path.realpath(__file__))
for root, subFolder, files in os.walk(destination_dir):
    if root.find("__pycache__") != -1:
        continue
    for file in files:
        if file.find("procedure_") == 0:
            _system = os.path.split(root)[1]
            package_name = __name__.split(".")[:-1]
            package_name.append(_system)
            package_name = ".".join(package_name)
            # print(file[:-3],package_name,root, subFolder)
            print(file[:-3], package_name,subFolder)
            importlib.import_module("." + file[:-3], package=package_name)

