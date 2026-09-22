import numpy as np, json
from scipy.optimize import least_squares
pts=[("Moscow",1022,1537,37.62,55.75),("Petersburg",1057,1190,30.3,59.94),("Novgorod",1016,1303,31.28,58.52),("Vologda",1240,1460,39.9,59.22),
("Kiev",615,1578,30.52,50.45),("Voronezh",863,1622,39.2,51.67),("Belgorod",710,1610,36.6,50.6),
("Isfahan",547,2835,51.67,32.65),("Hamadan",463,2665,48.52,34.8),("Herat",907,3045,62.2,34.35),("Balkh",1183,3095,66.9,36.76),
("Samarkand",1165,2880,66.96,39.65),("Ghazni",1260,3288,68.42,33.55),("Lahore",1480,3505,74.35,31.55),
("Kashgar",1596,2900,75.99,39.47),("Tobolsk",1767,1968,68.25,58.2),("Tara",1810,2193,74.4,56.9),("Yeniseysk",2500,2167,92.17,58.45),
("Krasnoyarsk",2462,2365,92.87,56.0),("Irkutsk",2932,2548,104.3,52.29),("Nerchinsk",3176,2540,116.5,51.98),("Beijing",3365,3265,116.4,39.9),
("Nanjing",3517,3685,118.8,32.06),("Xian",3048,3615,108.95,34.27),("Osaka",4220,3280,135.5,34.7),("Tokyo",4357,3165,139.7,35.7)]
P=np.array([[p[1],p[2]] for p in pts],float);L=np.array([[p[3],p[4]] for p in pts],float)
def model(q,L):
    n,l0,a,b,x0,y0=q
    lam=np.radians(L[:,0]-l0);r=a-b*L[:,1]
    th=n*lam
    return np.stack([x0+r*np.sin(th),y0-r*np.cos(th)],1)  # north up: pole above (smaller y)
def res(q,w=None):
    d=(model(q,L)-P); return (d*(w[:,None] if w is not None else 1)).ravel()
best=None
for n in [.5,.7,.9]:
  for l0 in [60,80,100]:
    q0=[n,l0,8000,60,2500,-2000]
    r=least_squares(res,q0,loss='soft_l1',f_scale=60)
    if best is None or r.cost<best.cost: best=r
q=best.x;pred=model(q,L);err=np.hypot(*(pred-P).T)
print('params',q);[print(p[0],round(e)) for p,e in zip(pts,err)]
json.dump({'q':list(q)},open('fit.json','w'))
