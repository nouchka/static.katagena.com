#!/bin/sh

for i in {1..100}
do
	wget "http://www.city.kobe.lg.jp/information/public/online/onehundred-scenes/detail_img/img"$(echo $i|awk '{ printf "%03d\n", $1}')"_01.png"
done

mv img*.png web/kobe/
