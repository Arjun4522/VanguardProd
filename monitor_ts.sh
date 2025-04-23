#!/bin/bash
echo "=== TimeSeries Keys ==="
redis-cli --scan --pattern 'network:*'

echo -e "\n=== network:bytes Stats ==="
redis-cli TS.INFO network:bytes | grep -E "totalSamples|memoryUsage"

echo -e "\n=== Latest 5 Values ==="
redis-cli TS.RANGE network:bytes - + COUNT 5
