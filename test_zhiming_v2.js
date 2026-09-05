const fs = require('fs');
const html = fs.readFileSync('/workspace/知命V2.html','utf8');

// Stub browser globals
const stubLS = { _d:{}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]} };
global.localStorage = stubLS;
global.window = global;
function mkEl(){
  return {
    appendChild(){},remove(){},select(){},click(){},
    value:'',href:'',download:'',innerHTML:'',textContent:'',
    style:{},dataset:{},
    classList:{add(){},remove(){},toggle(){return false},contains(){return false}},
    closest(){return null},
    querySelector(){return mkEl()},
    querySelectorAll(){return []},
    getElementsByTagName(){return []},
    checked:false,
    files:null,
    files__proto:null
  };
}
const doc = {
  addEventListener(){},
  body: {
    classList: {add(){},remove(){},toggle(){return false},contains(){return false}}
  },
  createElement(){return mkEl()},
  createTextNode(){return {}},
  querySelector(){return mkEl()},
  querySelectorAll(){return []},
  getElementById(){return mkEl()},
  getElementsByName(){return [mkEl(),mkEl()]},
  createDocumentFragment(){return mkEl()},
  addEventListener(){},
  URL:global.URL
};
global.document = doc;
global.addEventListener = ()=>{};
global.alert = (...a)=>console.log('[ALERT]',...a);
global.confirm = ()=>false;
global.Blob = function Blob_(a,o){this.a=a;this.o=o;};
global.URL = {createObjectURL(){return ''},revokeObjectURL(){}};
global.setTimeout = function(fn){ /* 同步执行关键回测 */ try{fn();}catch(e){console.log('[ST_ERR]',e.message);} };
global.clearTimeout = ()=>{};

// Extract script blocks
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
const blocks=[]; let m;
while((m=re.exec(html))!==null) blocks.push(m[1]);
const code = blocks.join('\n\n');

try {
  eval(code);
} catch(e) {
  console.log('EXEC_ERR:', e.message);
  console.log(e.stack);
  process.exit(1);
}

console.log('\n======== validateJieqi 锚点校验 ========');
validateJieqi();

console.log('\n======== 前3个 TEST_BAZI 回测 ========');
const TB = TEST_BAZI;
TB.slice(0,3).forEach((t,i)=>{
  const r = baziCalc({year:t.y,month:t.m,day:t.d,hour:t.h,minute:t.minute||0,gender:t.gender,cityLng:t.lngE});
  const actual = r.pillars.map(p=>p.gz).join(' ');
  const expP = t.expect.split(' ');
  const actP = r.pillars.map(p=>p.gz);
  const checks = expP.map((e,idx)=> {
    if (/[?？]/.test(e)) return {ok:true, skip:true, col:['年','月','日','时'][idx]};
    return {ok:e===actP[idx], col:['年','月','日','时'][idx], exp:e, act:actP[idx]};
  });
  const ok = checks.filter(c=>c.ok).length;
  const tot = checks.length;
  console.log('['+(i+1)+'] '+t.name+':');
  console.log('   出生地经度: '+t.lngE+' ('+t.city+')');
  console.log('   期望: '+t.expect);
  console.log('   实际: '+actual);
  console.log('   真太阳时: '+r.trueSolar);
  checks.forEach(c=>{
    if(c.skip) console.log('   - '+c.col+'柱: (忽略占位符)');
    else console.log('   - '+c.col+'柱: '+(c.ok?'✅ PASS':'❌ FAIL')+'  expect='+c.exp+'  actual='+c.act);
  });
  console.log('   结果: '+ok+'/'+tot+' 通过 '+(ok===tot?'🟢 ALL PASS':'🔴'));
});

console.log('\n======== 小暑边界 CASE 5 & 6 (月柱关键) ========');
[4,5].forEach(ti=>{
  const t = TB[ti];
  const r = baziCalc({year:t.y,month:t.m,day:t.d,hour:t.h,minute:t.minute||0,gender:t.gender,cityLng:t.lngE});
  const actual = r.pillars.map(p=>p.gz).join(' ');
  console.log(t.name+':');
  console.log('   期望(月柱必须): '+t.expect);
  console.log('   实际: '+actual);
  console.log('   真太阳时: '+r.trueSolar+' (锚点小暑=1989-07-07 11:19)');
  const xiaoshu = getJieqi(1989, 12);
  const tstT = new Date(r.trueSolar.replace(/-/g,'/'));
  const before = tstT < xiaoshu;
  console.log('   tst < 小暑? '+before+' => 月柱应该是 '+(before?'庚午':'辛未')+' 实际月柱: '+r.pillars[1].gz);
});

console.log('\n======== Qimen 自测锚点 2024-02-04 20:00 lng=116.4 ========');
{
  const qr = qimenCalc({y:2024,m:2,d:4,h:20,minute:0,cityLng:116.4,gender:"男"});
  console.log('阴阳遁: ' + qr.dun + ' / 节气: ' + qr.jieqi + ' / 三元: ' + qr.sanyuan + ' / 局数: ' + qr.juNum);
  console.log('四柱: ' + qr.pillars.y + ' ' + qr.pillars.m + ' ' + qr.pillars.d + ' ' + qr.pillars.h);
  console.log('值符星: ' + qr.zhiFuXing + '(' + qr.zhiFuGong + '宫)  值使门: ' + qr.zhiShiMen + '(' + qr.zhiShiGong + '宫)');
  const xingOut = {}; for (let g=1;g<=9;g++) xingOut[g] = qr.tianpanXing[g] || "";
  const tgOut = {}; for (let g=1;g<=9;g++) tgOut[g] = qr.tianpanGan[g] || "";
  console.log('地盘9宫干:', JSON.stringify(qr.dipan));
  console.log('天盘九星:', JSON.stringify(xingOut));
  console.log('天盘干:  ', JSON.stringify(tgOut));
  console.log('八门8宫: ', JSON.stringify(qr.bamen));
  console.log('八神8宫: ', JSON.stringify(qr.bashen));
  console.log('吉格: ', qr.goodGe);
  console.log('凶格: ', qr.badGe);
  console.log('真太阳时: ', qr.trueSolar);
  // 结构校验: 检查undefined
  let hasUndef = false;
  for (let g=1;g<=9;g++){
    if (!qr.dipan[g]) { hasUndef=true; console.log(' !! 地盘宫'+g+' undefined'); }
    if (!qr.tianpanXing[g]) { hasUndef=true; console.log(' !! 天盘星宫'+g+' undefined'); }
    if (!qr.tianpanGan[g]) { hasUndef=true; console.log(' !! 天盘干宫'+g+' undefined'); }
  }
  for (const gk of [1,2,3,4,6,7,8,9]){
    if (!qr.bamen[gk]) { hasUndef=true; console.log(' !! 八门宫'+gk+' undefined'); }
    if (!qr.bashen[gk]) { hasUndef=true; console.log(' !! 八神宫'+gk+' undefined'); }
  }
  console.log(hasUndef ? '❌ 存在undefined错误' : '✅ 结构完整 无undefined错误');
}
