from collections import deque


def find_constrained_gray_paths(start_pattern, targets, constraint_positions=None, max_ones=3, reverse=False):
    def is_valid_pattern(pattern):
        if constraint_positions and pattern[constraint_positions[0]] == '1' and pattern[constraint_positions[1]] == '1':
            return False
        if pattern.count('1') > max_ones:
            return False
        if pattern.count('1') == 0:
            return False
        return True
    
    def get_neighbors(current_pattern):
        neighbors = []
        for i in range(len(current_pattern)):
            neighbor_list = list(current_pattern)
            neighbor_list[i] = '1' if current_pattern[i] == '0' else '0'
            neighbor = ''.join(neighbor_list)
            if is_valid_pattern(neighbor):
                neighbors.append(neighbor)
        return neighbors
    
    def find_path_bfs(start, target):
        if start == target:
            return [start]
        queue = deque([(start, [start])])
        visited = {start}
        while queue:
            current, path = queue.popleft()
            for neighbor in get_neighbors(current):
                if neighbor == target:
                    return path + [neighbor]
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))
        return None
    
    def find_path_bfs_reverse(target, start):
        if start == target:
            return [target]
        queue = deque([(target, [target])])
        visited = {target}
        while queue:
            current, path = queue.popleft()
            for neighbor in get_neighbors(current):
                if neighbor == start:
                    return path + [neighbor]
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))
        return None
    
    results = {}
    if reverse:
        path = find_path_bfs_reverse(targets, start_pattern)
        if path:
            results[targets] = path[::-1]
        else:
            results[targets] = None
    else:
        path = find_path_bfs(start_pattern, targets)
        results[targets] = path
    return results

if __name__ == "__main__":
    start = "000001"
    targets = ["001011", "000110", "001011", "010011", "011001", "100011"]
    c1 = (3,5)
    # targets = ["00111", "01110", "01011", "00011", "10001"]
    # c1 = (0,3)
    for t in targets:
        p = find_constrained_gray_paths(start, t, constraint_positions=c1, max_ones=3, reverse=False)
        print(p)