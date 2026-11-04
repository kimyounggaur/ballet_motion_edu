#!/bin/bash
# usage: K='{...}' ./s5_grid.sh   -> per (T, polish): worst-case over the three sliding moves
for T in 60 65 70 75 80; do for p in 1 0; do
  out=$(T=$T K="$K" node s5_foot.js tendu,arabesque,positions $p | sed -E 's/^([a-z]+) +ankle ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| knee ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| heel ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| ball ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| tip ([0-9.]+)@[0-9.]+\(n>3:[ 0-9]+\) \| toe-angle d2 ([0-9.]+).*$/\1 \2 \3 \4 \5 \6 \7/')
  fl=$(T=$T K="$K" node s5_float.js tendu,arabesque,positions $p | sed -E 's/^([a-z]+) .*max float (-?[0-9.]+)mm.*deepest sink (-?[0-9.]+)mm.*$/\1 \2 \3/')
  echo "$out" | awk -v T=$T -v p=$p 'BEGIN{a=k=h=b=t=o=0} {if($2>a)a=$2; if($3>k)k=$3; if($4>h)h=$4; if($5>b)b=$5; if($6>t)t=$6; if($7>o)o=$7} END{printf "T=%s p%s: ankle %.2f knee %.2f heel %.1f ball %.1f tip %.1f toe° %.1f", T,p,a,k,h,b,t,o}'
  echo "$fl" | awk 'BEGIN{f=0;s=0} {if($2>f)f=$2; if($3<s)s=$3} END{printf " | float %.2f sink %.2f\n", f,s}'
done; done
