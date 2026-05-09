
// ════════════════════════════════════════════
// QR CODE GENERATOR — Pure JS, no dependencies
// Generates SVG QR codes for churches to print/post
// ════════════════════════════════════════════
const QR = (function(){
  // Minimal QR Mode 2 (Alphanumeric/Byte) for URLs
  const GF256_EXP = [1,2,4,8,16,32,64,128,29,58,116,232,205,135,19,38,76,152,45,90,180,117,234,201,143,3,6,12,24,48,96,192,157,39,78,156,37,74,148,53,106,212,181,119,238,193,159,35,70,140,5,10,20,40,80,160,93,186,105,210,185,111,222,161,95,190,97,194,153,47,94,188,101,202,137,15,30,60,120,240,253,231,211,187,107,214,177,127,254,225,223,163,91,182,113,226,217,175,67,134,17,34,68,136,13,26,52,104,208,189,103,206,129,31,62,124,248,237,199,147,59,118,236,197,151,51,102,204,133,23,46,92,184,109,218,169,79,158,33,66,132,21,42,84,168,77,154,41,82,164,85,170,73,146,57,114,228,213,183,115,230,209,191,99,198,145,63,126,252,229,215,179,123,246,241,255,227,219,171,75,150,49,98,196,149,55,110,220,165,87,174,65,130,25,50,100,200,141,7,14,28,56,112,224,221,167,83,166,81,162,89,178,121,242,249,239,195,155,43,86,172,69,138,9,18,36,72,144,61,122,244,245,247,243,251,235,203,139,11,22,44,88,176,125,250,233,207,131,27,54,108,216,173,71,142];
  const GF256_LOG = Array(256).fill(0);
  for(let i=0;i<255;i++) GF256_LOG[GF256_EXP[i]] = i;
  GF256_LOG[0] = 0;
  
  function gfMul(a,b){ if(!a||!b) return 0; return GF256_EXP[(GF256_LOG[a]+GF256_LOG[b])%255]; }
  function gfDiv(a,b){ if(!b) throw new Error('div0'); if(!a) return 0; return GF256_EXP[(GF256_LOG[a]-GF256_LOG[b]+255)%255]; }
  
  function polyMul(a,b){
    const r = Array(a.length+b.length-1).fill(0);
    for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) r[i+j] ^= gfMul(a[i],b[j]);
    return r;
  }
  
  function rsGenPoly(n){
    let g = [1];
    for(let i=0;i<n;i++) g = polyMul(g, [1, GF256_EXP[i]]);
    return g;
  }
  
  function rsEncode(msg, ecLen){
    const g = rsGenPoly(ecLen);
    const out = msg.slice().concat(Array(ecLen).fill(0));
    for(let i=0;i<msg.length;i++){
      const coef = out[i];
      if(coef) for(let j=0;j<g.length;j++) out[i+j] ^= gfMul(g[j], coef);
    }
    return out.slice(msg.length);
  }
  
  // Version 3 = 29x29 modules, L=15% ECC
  const V3_SIZE = 29;
  const V3_EC = 26; // data codewords
  const V3_ECC = 10; // error correction
  
  function modeBits(data){
    // Byte mode for URLs
    const bytes = new TextEncoder().encode(data);
    const bits = [];
    bits.push(0,1,0,0); // mode indicator: byte
    bits.push(...Array(8).fill(0).map((_,i)=> (bytes.length>>>(7-i))&1 )); // count 8-bit
    for(const b of bytes) for(let i=7;i>=0;i--) bits.push((b>>>i)&1);
    // Pad to byte boundary
    while(bits.length%8) bits.push(0);
    // Pad with 236, 17
    const pad = [0b11101100, 0b00010001];
    while(bits.length/8 < V3_EC) bits.push(...Array(8).fill(0).map((_,i)=>(pad[(bits.length/8)%2]>>>(7-i))&1));
    return bits;
  }
  
  function interleave(bits){
    const cw = [];
    for(let i=0;i<bits.length;i+=8){
      let b=0; for(let j=0;j<8;j++) b = (b<<1)|bits[i+j];
      cw.push(b);
    }
    const ec = rsEncode(cw.slice(0, V3_EC), V3_ECC);
    return cw.concat(ec);
  }
  
  function createModules(data){
    const size = V3_SIZE;
    const m = Array.from({length:size},()=>Array(size).fill(-1));
    
    function setFinder(x,y){
      for(let i=0;i<7;i++) for(let j=0;j<7;j++){
        m[y+i][x+j] = (i===0||i===6||j===0||j===6||(i>=2&&i<=4&&j>=2&&j<=4))?1:0;
      }
    }
    setFinder(0,0); setFinder(size-7,0); setFinder(0,size-7);
    // Separators
    for(let i=0;i<8;i++) for(let j=0;j<8;j++){
      if(i===7||j===7) { if(i<size&&j<size&&m[i][j]===-1) m[i][j]=0; }
    }
    for(let i=0;i<8;i++) for(let j=0;j<8;j++){
      const pts = [[i,size-8+j],[size-8+i,j]]; 
      for(const [px,py] of pts) if(px<size&&py<size&&m[py][px]===-1) m[py][px]=0;
    }
    // Timing patterns
    for(let i=8;i<size-8;i++){ m[6][i] = i%2===0?1:0; m[i][6] = i%2===0?1:0; }
    // Dark module
    m[size-8][8] = 1;
    // Format info area (keep empty for now, simplified)
    
    const codewords = interleave(modeBits(data));
    let bitIdx=0, dir=-1, col=size-1;
    while(col>0){
      if(col===6) col--;
      for(let i=0;i<size;i++){
        const row = dir===1?i:size-1-i;
        for(let c=0;c<2;c++){
          const cc = col-c;
          if(m[row][cc]===-1){
            m[row][cc] = (bitIdx < codewords.length*8)
              ? (codewords[Math.floor(bitIdx/8)] >>> (7-(bitIdx%8))) & 1
              : 0;
            bitIdx++;
          }
        }
      }
      dir = -dir; col -= 2;
    }
    return m;
  }
  
  function toSVG(data, opts={}){
    const {size=200, color='#1a3c1a', bg='#f5f0e8'} = opts;
    const modules = createModules(data);
    const n = modules.length;
    const cell = Math.floor(size/n);
    const actual = cell * n;
    let paths = '';
    for(let y=0;y<n;y++){
      for(let x=0;x<n;x++){
        if(modules[y][x]) paths += `M${x*cell},${y*cell}h${cell}v${cell}h-${cell}z`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${actual} ${actual}" width="${actual}" height="${actual}" style="background:${bg}">
      <rect width="${actual}" height="${actual}" fill="${bg}"/>
      <path d="${paths}" fill="${color}"/>
    </svg>`;
  }
  
  return { create: toSVG, raw: createModules };
})();
