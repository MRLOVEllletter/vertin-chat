@echo off
cd /d D:\我的项目\MyVertinChat\GPT-SoVITS
python api.py -s GPT_SoVITS/pretrained_models/vertin/Vertin_e2_s154_l32.pth -g GPT_SoVITS/pretrained_models/vertin/Vertin-e10.ckpt -d cuda -p 9880 -hp -dr e1.wav -dt Are you still allow a point of contact for the Foundation, Madam Z? -dl en
pause
