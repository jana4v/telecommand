import os
import sys
import shutil
import compileall
import python_minifier

# Get the current script path
path = os.path.dirname(__file__)

cwd = os.getcwd().split(os.sep)
code_dir_index = cwd.index("code")
code_dir = os.sep.join(cwd[:code_dir_index+1])
minified_code_dir = os.sep.join(cwd[:code_dir_index+2])
#path = os.getcwd()
if path not in sys.path:
    sys.path.append(path)

def minify_file(source_file, destination_file):
    try:
        # Read the source file
        with open(source_file, 'r', encoding='utf-8') as f:
            source_code = f.read()

        # Minify the source code
        minified_code = python_minifier.minify(source_code)

        # Write the minified code to the destination file
        with open(destination_file, 'w', encoding='utf-8') as f:
            f.write(minified_code)

        print(f"Minified: {source_file} -> {destination_file}")
    except Exception as e:
        print(f"Failed to minify {source_file}: {e}")

def copy_other_files(source_file, destination_file):
    """ Copy non-python files to the destination preserving structure """
    try:
        shutil.copy2(source_file, destination_file)
        print(f"Copied: {source_file} -> {destination_file}")
    except Exception as e:
        print(f"Failed to copy {source_file}: {e}")

def minify_all_files_in_directory(src_directory, dest_directory):
    for root, dirs, files in os.walk(src_directory):
        # Calculate relative path from the src_directory
        rel_path = os.path.relpath(root, src_directory)
        
        # Create corresponding directories in the destination directory
        dest_dir_path = os.path.join(dest_directory, rel_path)
        os.makedirs(dest_dir_path, exist_ok=True)

        for file in files:
            source_file_path = os.path.join(root, file)
            destination_file_path = os.path.join(dest_dir_path, file)

            if file.endswith(".py"):
                # Minify Python files
                minify_file(source_file_path, destination_file_path)
            if file.endswith(".bat"):
                pass
            else:
                # Copy other non-Python files
                copy_other_files(source_file_path, destination_file_path)

def compile_minified_files(dest_directory):
    try:
        # Compile all Python files in the destination directory recursively
        compileall.compile_dir(dest_directory, force=True)
        print(f"Compiled all .py files in {dest_directory} to .pyc")
    except Exception as e:
        print(f"Failed to compile files: {e}")

def copy_pyc_files(src_directory, dist_directory):
    """Copy .pyc files to dist with the same directory structure and rename them appropriately."""
    for root, dirs, files in os.walk(src_directory):
        for file in files:
            if file.endswith(".pyc"):
                # Find the original Python file name (remove .cpython-XX suffix)
                original_file_name = file.split(".")[0] + ".pyc"
                
                # Calculate relative path
                rel_path = os.path.relpath(root, src_directory).replace("__pycache__", "")
                dist_dir_path = os.path.join(dist_directory, rel_path)
                os.makedirs(dist_dir_path, exist_ok=True)

                # Source .pyc file path
                pyc_file_path = os.path.join(root, file)

                # Destination .pyc file path (renamed appropriately)
                dest_file_path = os.path.join(dist_dir_path, original_file_name)

                try:
                    shutil.copy2(pyc_file_path, dest_file_path)
                    print(f"Copied .pyc: {pyc_file_path} -> {dest_file_path}")
                except Exception as e:
                    print(f"Failed to copy {pyc_file_path}: {e}")

def copy_non_python_files_to_dist(src_directory, dist_directory):
    """Copy non-Python files (excluding .py and .pyc) to the dist directory."""
    for root, dirs, files in os.walk(src_directory):
        for file in files:
            # Exclude .py and .pyc files
            if not file.endswith(".py") and not file.endswith(".pyc"):
                # Calculate relative path
                rel_path = os.path.relpath(root, src_directory)
                dist_dir_path = os.path.join(dist_directory, rel_path)
                os.makedirs(dist_dir_path, exist_ok=True)

                source_file_path = os.path.join(root, file)
                destination_file_path = os.path.join(dist_dir_path, file)

                try:
                    shutil.copy2(source_file_path, destination_file_path)
                    print(f"Copied: {source_file_path} -> {destination_file_path}")
                except Exception as e:
                    print(f"Failed to copy {source_file_path}: {e}")
def generate_dist_files(relative_directory):
    src_directory = os.path.join(path, relative_directory)  # Source directory containing the files
    minified_directory = os.path.join(minified_code_dir, "minified", relative_directory)  # Directory for minified files
    #dist_directory = os.path.join(path, "dist", relative_directory)  # Directory for compiled .pyc files and others
    
    _i = path.split(os.sep).index("code")
    print(_i)
    dist_directory_path = code_dir+os.sep+"deployment"+os.sep+"apps"
    dist_directory = os.path.join(dist_directory_path, relative_directory)  # Directory for compiled .pyc files and others

    # Ensure the destination and distribution directories exist
    os.makedirs(minified_directory, exist_ok=True)
    os.makedirs(dist_directory, exist_ok=True)

    # Step 1: Minify all Python files and copy all other files from src to minified
    minify_all_files_in_directory(src_directory, minified_directory)

    # Step 2: Compile all minified Python files to .pyc files
    compile_minified_files(minified_directory)

    # Step 3: Copy .pyc files to the dist directory with appropriate renaming
    copy_pyc_files(minified_directory, dist_directory)

    # Step 4: Copy all non-.py files (excluding .pyc) to the dist folder
    copy_non_python_files_to_dist(minified_directory, dist_directory)

    print("Minification, compilation, and distribution complete.")



if __name__ == "__main__":
    print(path)
    path.split(os.sep)
    # Set the path to your src directory and destination directories
    # src_directory = os.path.join(path, "code", "Telecommand")  # Source directory containing the files
    # minified_directory = os.path.join(path, "minified", "Telecommand")  # Directory for minified files
    
    
    # dist_directory = os.path.join(path, "dist", "Telecommand")  # Directory for compiled .pyc files and others
    
    # # Ensure the destination and distribution directories exist
    # os.makedirs(minified_directory, exist_ok=True)
    # os.makedirs(dist_directory, exist_ok=True)

    # # Step 1: Minify all Python files and copy all other files from src to minified
    # minify_all_files_in_directory(src_directory, minified_directory)

    # # Step 2: Compile all minified Python files to .pyc files
    # compile_minified_files(minified_directory)

    # # Step 3: Copy .pyc files to the dist directory with appropriate renaming
    # copy_pyc_files(minified_directory, dist_directory)

    # # Step 4: Copy all non-.py files (excluding .pyc) to the dist folder
    # copy_non_python_files_to_dist(minified_directory, dist_directory)

    # print("Minification, compilation, and distribution complete.")
