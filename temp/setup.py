import sys,os
from cx_Freeze import setup, Executable

# Increase the recursion limit
sys.setrecursionlimit(2000)
include_files = []
path = os.path.dirname(__file__)
directories_to_include = [os.path.join(path, "database"), os.path.join(path, "src/GenerateProcedure/plugins/Procedures") ]

# List to hold files to be included with their relative paths
include_files = []

# Iterate through directories to include
for directory in directories_to_include:
    base_path_length = len(directory) + 1  # Calculate the base path length for relative paths
    for dirpath, dirnames, filenames in os.walk(directory):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            relative_path = file_path[base_path_length:]  # Create relative path
            include_files.append((file_path, os.path.join(os.path.basename(directory), relative_path)))
#include_files.append("src/GenerateProcedure/plugins/Procedures/")

print(include_files)
build_exe_options = {
    # "packages": ["asyncio", "uvicorn","fastexcel","src", "src.GenerateProcedure.plugins"],  # Add necessary packages here
    "packages": ["asyncio", "uvicorn","fastexcel"],
    "excludes": [],
    "zip_include_packages": [],
    "include_files":include_files

}

setup(
    name="Telecommand Software",
    version="2.0.0",
    description="TC application!",
    options={"build_exe": build_exe_options},
    executables=[Executable("tc.py", base="console")],
)
