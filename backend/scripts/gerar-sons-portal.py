import math,wave,struct,json
from pathlib import Path
out=Path('frontend/assets/portal-sons')
tracks=[('classico','PetHub Clássico',[659,880,988],.19,1),('suave','PetHub Suave',[523,659],.35,.65),('pedido','Novo Pedido',[784,784,1047],.14,1.1),('sino','Sino Digital',[1319,988],.28,1.5),('alegre','Toque Alegre',[523,659,784,1047],.12,.8),('moderno','Notificação Moderna',[740,1109,880],.17,.45),('duplo','Alerta Duplo',[880,659,880,659],.12,1.2),('cristal','Toque Cristalino',[1568,1319,1047],.22,1.7),('campainha','Campainha',[659,523,659,523],.24,.9),('premium','Alerta Premium',[587,740,880,1175],.21,1.35)]
rate=22050;catalog=[]
for id,name,notes,step,timbre in tracks:
 length=len(notes)*step+.7;n=int(length*rate);samples=[]
 for i in range(n):
  t=i/rate;x=0
  for j,f in enumerate(notes):
   u=t-j*step
   if 0<=u<.8:
    env=min(1,u/.009)*math.exp(-u/(.16+.04*timbre))
    x+=env*(math.sin(2*math.pi*f*u)+.16*math.sin(2*math.pi*f*(2+.01*timbre)*u)+.08*math.sin(2*math.pi*f*3*u))
  samples.append(int(max(-1,min(1,x*.22))*32767))
 with wave.open(str(out/(id+'.wav')),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(struct.pack('<'+'h'*n,*samples))
 catalog.append({'id':id,'nome':name,'url':'/assets/portal-sons/'+id+'.wav'})
(out/'catalogo.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2))
(out/'LICENCA.txt').write_text('Sons originais sintetizados para o PetHub. CC0 1.0 Universal: uso, cópia, alteração e distribuição autorizados, inclusive comercial. Sem samples de terceiros. Gerador em backend/scripts/gerar-sons-portal.py.\n')
