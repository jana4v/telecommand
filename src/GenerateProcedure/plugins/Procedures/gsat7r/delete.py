from collections import deque

def find_gray_code_path(start_pattern, target="000001", forbidden_patterns=None):
    """
    Find a path from start_pattern to target following Gray code rules.
    
    Args:
        start_pattern (str): Starting binary pattern
        target (str): Target pattern (default: "000001")
        forbidden_patterns (set): Set of forbidden patterns to avoid
    
    Returns:
        list: Path from start to target, or None if no path found
    """
    if forbidden_patterns is None:
        forbidden_patterns = set()
    
    # Convert to sets for faster lookup
    forbidden_patterns = set(forbidden_patterns)
    
    # Check if start or target is forbidden
    if start_pattern in forbidden_patterns or target in forbidden_patterns:
        return None
    
    if start_pattern == target:
        return [start_pattern]
    
    # BFS to find shortest path
    queue = deque([(start_pattern, [start_pattern])])
    visited = {start_pattern}
    
    pattern_length = len(start_pattern)
    
    while queue:
        current_pattern, path = queue.popleft()
        
        # Generate all possible next patterns (change one bit)
        for i in range(pattern_length):
            # Flip bit at position i
            next_pattern_list = list(current_pattern)
            next_pattern_list[i] = '1' if current_pattern[i] == '0' else '0'
            next_pattern = ''.join(next_pattern_list)
            
            # Check if we reached target
            if next_pattern == target:
                return path + [next_pattern]
            
            # Check if pattern is valid (not visited, not forbidden, and not already in path)
            if (next_pattern not in visited and 
                next_pattern not in forbidden_patterns and
                next_pattern not in path):
                
                visited.add(next_pattern)
                queue.append((next_pattern, path + [next_pattern]))
    
    return None  # No path found

def print_path(path):
    print(path)
    return
    """Pretty print the path"""
    if path is None:
        print("No path found!")
        return
    
    print(f"Path found ({len(path)} steps):")
    for i, pattern in enumerate(path):
        if i == 0:
            print(f"Start: {pattern}")
        elif i == len(path) - 1:
            print(f"Step {i}: {pattern} (Target reached!)")
        else:
            print(f"Step {i}: {pattern}")
    
    # Show bit changes
    print("\nBit changes:")
    for i in range(len(path) - 1):
        diff_pos = find_diff_position(path[i], path[i+1])
        print(f"Step {i+1}: Change bit {diff_pos} ({path[i]} → {path[i+1]})")

def find_diff_position(pattern1, pattern2):
    """Find the position where two patterns differ"""
    for i, (bit1, bit2) in enumerate(zip(pattern1, pattern2)):
        if bit1 != bit2:
            return i
    return -1

# Example usage
if __name__ == "__main__":
    # Example 1: Original problem
    start = "001011"
    target = "000001"
    forbidden = {"000101","000000"}  # Forbidden pattern
    
    print("=== Example 1: Original Problem ===")
    path = find_gray_code_path(start, target, forbidden)
    print_path(path)
    
    print("\n" + "="*50 + "\n")
    
    # Example 2: Different start pattern
    start2 = "000110"
    print("=== Example 2: Different Start Pattern ===")
    path2 = find_gray_code_path(start2, target, forbidden)
    print_path(path2)
    
    print("\n" + "="*50 + "\n")
    
    # Example 3: No forbidden patterns
    start3 = "001011"
    print("=== Example 3: No Forbidden Patterns ===")
    path3 = find_gray_code_path(start3, target)
    print_path(path3)
    
    print("\n" + "="*50 + "\n")
    
    # Example 4: Multiple forbidden patterns
    start4 = "010011"
    
    print("=== Example 4: Multiple Forbidden Patterns ===")
    path4 = find_gray_code_path(start4, target, forbidden)
    print_path(path4)


    start4 = "011001"
    
    print("=== Example 5: Multiple Forbidden Patterns ===")
    path4 = find_gray_code_path(start4, target, forbidden)
    print_path(path4)
    
    
    start4 = "100010"
    
    print("=== Example 6: Multiple Forbidden Patterns ===")
    path4 = find_gray_code_path(start4, target, forbidden)
    print_path(path4)

    print("====================================")
   
    start4 = "00111"
    target = "00001"
    forbidden = {"10010","00000"}  # Forbidden pattern
    print("=== Example 6: Multiple Forbidden Patterns ===")
    path4 = find_gray_code_path(start4, target, forbidden)
    print_path(path4)
    
    
    start4 = "01110"
    target = "00001"
    forbidden = {"10010","00000"}  # Forbidden pattern
    print("=== Example 7: Multiple Forbidden Patterns ===")
    path4 = find_gray_code_path(start4, target, forbidden)
    print_path(path4)
    
    start4 = "01011"
    target = "00001"
    forbidden = {"10010","00000"}  # Forbidden pattern
    print("=== Example 7: Multiple Forbidden Patterns ===")
    path4 = find_gray_code_path(start4, target, forbidden)
    print_path(path4)
    
    
    start4 = "00011"
    target = "00001"
    forbidden = {"10010","00000"}  # Forbidden pattern
    print("=== Example 7: Multiple Forbidden Patterns ===")
    path4 = find_gray_code_path(start4, target, forbidden)
    print_path(path4)
    
    start4 = "10001"
    target = "00001"
    forbidden = {"10010","00000"}  # Forbidden pattern
    print("=== Example 8: Multiple Forbidden Patterns ===")
    path4 = find_gray_code_path(start4, target, forbidden)
    print_path(path4)
    
    
    
def find_1_to_0_changes(old_bits, new_bits):
    changes = []
    
    # Compare bit by bit
    for i in range(min(len(old_bits), len(new_bits))):
        if old_bits[i] == '1' and new_bits[i] == '0':
            changes.append(i)
    
    return changes

print(find_1_to_0_changes("01101","01100"))