#!/bin/bash
# usage: s5_scan.sh '<json-with-@D1@-@DLO@>' d1list dlolist
tmpl="$1"; shift
for d1 in $1; do for dlo in $2; do
  K=$(echo "$tmpl" | sed "s/@D1@/$d1/; s/@DLO@/$dlo/")
  line=$(K="$K" node s5_foot.js tendu,arabesque,positions 1 | sed -E 's/ankle ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| knee ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| heel ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| ball ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| tip ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| toe-angle d2 ([0-9.]+)°@[0-9.]+/A\1 K\2 h\3 b\4 t\5 toe\6/' | awk '{printf "%s | ", $0}')
  echo "d1=$d1 dlo=$dlo :: $line"
done; done
