#!/bin/bash
# Replace all JSX.Element with React.JSX.Element in TypeScript files

find src -name "*.tsx" -type f -exec sed -i 's/: JSX\.Element/: React.JSX.Element/g' {} \;
echo "Fixed all JSX.Element references"
