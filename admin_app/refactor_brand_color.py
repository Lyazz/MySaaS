import os
import re

lib_dir = "lib"

for root, dirs, files in os.walk(lib_dir):
    for file in files:
        if file.endswith(".dart"):
            file_path = os.path.join(root, file)
            if "app_theme.dart" in file_path:
                continue
            
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            orig_content = content
            
            # Replace AppColors.brandContrast with Theme.of(context).colorScheme.onPrimary
            content = re.sub(r'AppColors\.brandContrast', r'Theme.of(context).colorScheme.onPrimary', content)
            
            # Replace AppColors.brand with Theme.of(context).colorScheme.primary
            content = re.sub(r'AppColors\.brand', r'Theme.of(context).colorScheme.primary', content)
            
            # Remove const before BorderSide or other modifiers if it now contains Theme.of
            # Example: const BorderSide(color: Theme.of(context)...)
            content = re.sub(r'const\s+(BorderSide\(\s*color:\s*Theme\.of\(context\))', r'\1', content)
            
            # Example: const Icon(..., color: Theme.of(context)...)
            content = re.sub(r'const\s+(Icon\([^\)]*color:\s*Theme\.of\(context\))', r'\1', content)
            
            if content != orig_content:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {file_path}")
