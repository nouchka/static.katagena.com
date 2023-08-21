#!/bin/bash

mkdir -p .cache/
cd .cache/
for i in {1..100}
do
	wget -nc "http://www.city.kobe.lg.jp/information/public/online/onehundred-scenes/detail_img/img"$(echo $i|awk '{ printf "%03d\n", $1}')"_01.png"
done

cd ../
cp .cache/img*.png public/kobe/
