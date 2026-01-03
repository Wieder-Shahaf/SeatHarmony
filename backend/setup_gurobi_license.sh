#!/bin/bash

# Gurobi License Setup Script
# Usage: ./setup_gurobi_license.sh <license-key>

LICENSE_KEY="${1:-b0d94cbb-812d-43eb-8443-76e804d334ae}"

echo "Setting up Gurobi license..."
echo "License Key: $LICENSE_KEY"
echo ""

# Check if grbgetkey exists
if command -v grbgetkey &> /dev/null; then
    echo "Found grbgetkey, setting up license..."
    grbgetkey "$LICENSE_KEY"
    exit $?
fi

# Try common installation paths
PATHS=(
    "/opt/gurobi*/bin/grbgetkey"
    "/usr/local/gurobi*/bin/grbgetkey"
    "$HOME/gurobi*/bin/grbgetkey"
    "/Applications/Gurobi*/bin/grbgetkey"
)

for path_pattern in "${PATHS[@]}"; do
    # Expand glob pattern
    for path in $path_pattern; do
        if [ -f "$path" ]; then
            echo "Found grbgetkey at: $path"
            "$path" "$LICENSE_KEY"
            exit $?
        fi
    done
done

echo "grbgetkey not found. Please install Gurobi Optimizer:"
echo ""
echo "1. Download from: https://www.gurobi.com/downloads/gurobi-optimizer-eula/"
echo "2. Install the package"
echo "3. Run this script again, or run: grbgetkey $LICENSE_KEY"
echo ""
echo "Alternatively, if you have a Web License Service (WLS) license,"
echo "set these environment variables:"
echo "  export GRB_WLSACCESSID=$LICENSE_KEY"
echo "  export GRB_WLSSECRET=<your-secret>"

