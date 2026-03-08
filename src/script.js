//////////////////// MD5 and connection logic /////////////////////////////////////
let MD5 = function(d) {
    var r = M(V(Y(X(d), 8 * d.length)));
    return r.toLowerCase()
};
function M(d) {
    for (var _, m = "0123456789ABCDEF", f = "", r = 0; r < d.length; r++)
        _ = d.charCodeAt(r),
        f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _);
    return f
}
function X(d) {
    for (var _ = Array(d.length >> 2), m = 0; m < _.length; m++)
        _[m] = 0;
    for (m = 0; m < 8 * d.length; m += 8)
        _[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32;
    return _
}
function V(d) {
    for (var _ = "", m = 0; m < 32 * d.length; m += 8)
        _ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255);
    return _
}
function Y(d, _) {
    d[_ >> 5] |= 128 << _ % 32,
    d[14 + (_ + 64 >>> 9 << 4)] = _;
    for (var m = 1732584193, f = -271733879, r = -1732584194, i = 271733878, n = 0; n < d.length; n += 16) {
        var h = m
          , t = f
          , g = r
          , e = i;
        f = md5_ii(f = md5_ii(f = md5_ii(f = md5_ii(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_ff(f = md5_ff(f = md5_ff(f = md5_ff(f, r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 0], 7, -680876936), f, r, d[n + 1], 12, -389564586), m, f, d[n + 2], 17, 606105819), i, m, d[n + 3], 22, -1044525330), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 4], 7, -176418897), f, r, d[n + 5], 12, 1200080426), m, f, d[n + 6], 17, -1473231341), i, m, d[n + 7], 22, -45705983), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 8], 7, 1770035416), f, r, d[n + 9], 12, -1958414417), m, f, d[n + 10], 17, -42063), i, m, d[n + 11], 22, -1990404162), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 12], 7, 1804603682), f, r, d[n + 13], 12, -40341101), m, f, d[n + 14], 17, -1502002290), i, m, d[n + 15], 22, 1236535329), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 1], 5, -165796510), f, r, d[n + 6], 9, -1069501632), m, f, d[n + 11], 14, 643717713), i, m, d[n + 0], 20, -373897302), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 5], 5, -701558691), f, r, d[n + 10], 9, 38016083), m, f, d[n + 15], 14, -660478335), i, m, d[n + 4], 20, -405537848), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 9], 5, 568446438), f, r, d[n + 14], 9, -1019803690), m, f, d[n + 3], 14, -187363961), i, m, d[n + 8], 20, 1163531501), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 13], 5, -1444681467), f, r, d[n + 2], 9, -51403784), m, f, d[n + 7], 14, 1735328473), i, m, d[n + 12], 20, -1926607734), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 5], 4, -378558), f, r, d[n + 8], 11, -2022574463), m, f, d[n + 11], 16, 1839030562), i, m, d[n + 14], 23, -35309556), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 1], 4, -1530992060), f, r, d[n + 4], 11, 1272893353), m, f, d[n + 7], 16, -155497632), i, m, d[n + 10], 23, -1094730640), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 13], 4, 681279174), f, r, d[n + 0], 11, -358537222), m, f, d[n + 3], 16, -722521979), i, m, d[n + 6], 23, 76029189), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 9], 4, -640364487), f, r, d[n + 12], 11, -421815835), m, f, d[n + 15], 16, 530742520), i, m, d[n + 2], 23, -995338651), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 0], 6, -198630844), f, r, d[n + 7], 10, 1126891415), m, f, d[n + 14], 15, -1416354905), i, m, d[n + 5], 21, -57434055), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 12], 6, 1700485571), f, r, d[n + 3], 10, -1894986606), m, f, d[n + 10], 15, -1051523), i, m, d[n + 1], 21, -2054922799), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 8], 6, 1873313359), f, r, d[n + 15], 10, -30611744), m, f, d[n + 6], 15, -1560198380), i, m, d[n + 13], 21, 1309151649), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 4], 6, -145523070), f, r, d[n + 11], 10, -1120210379), m, f, d[n + 2], 15, 718787259), i, m, d[n + 9], 21, -343485551),
        m = safe_add(m, h),
        f = safe_add(f, t),
        r = safe_add(r, g),
        i = safe_add(i, e)
    }
    return Array(m, f, r, i)
}
function md5_cmn(d, _, m, f, r, i) {
    return safe_add(bit_rol(safe_add(safe_add(_, d), safe_add(f, i)), r), m)
}
function md5_ff(d, _, m, f, r, i, n) {
    return md5_cmn(_ & m | ~_ & f, d, _, r, i, n)
}
function md5_gg(d, _, m, f, r, i, n) {
    return md5_cmn(_ & f | m & ~f, d, _, r, i, n)
}
function md5_hh(d, _, m, f, r, i, n) {
    return md5_cmn(_ ^ m ^ f, d, _, r, i, n)
}
function md5_ii(d, _, m, f, r, i, n) {
    return md5_cmn(m ^ (_ | ~f), d, _, r, i, n)
}
function safe_add(d, _) {
    var m = (65535 & d) + (65535 & _);
    return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m
}
function bit_rol(d, _) {
    return d << _ | d >>> 32 - _
}

const hexToBytes = (hex) => {
  var bytes = [];
  for (var c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
};
const bytesToHex = (value) => {
  let a = [];
  // Convert raw data bytes to hex values just for the sake of showing something.
  // In the "real" world, you'd use data.getUint8, data.getUint16 or even
  // TextDecoder to process raw data bytes.
  for (let i = 0; i < value.byteLength; i++) {
    a.push(('00' + value.getUint8(i).toString(16)).slice(-2));
  }
  return a.join('');
}
/////////// custom drill commands //////////////////////////////////////////////
function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}
function isDivisable(n,div){
    return Math.abs(n/div-Math.trunc(n/div))<=1e-5;
}
function createBall(us,ls,bh,dp,freq,reps){
    assert(us>=500 && us<=7274 && isDivisable(us,1),"upper wheel speed out of range");
    assert(ls>=500 && ls<=7274 && isDivisable(ls,1),"lower wheel speed out of range");
    assert(bh>=-50 && bh<=100 && isDivisable(bh,1),"ball height must be int within [-50 .. 100]");
    assert(dp>=-10 && dp<=10 && isDivisable(dp,0.5),"drop point must be multiple of 0.5 within [-10 .. 10]");
    assert(freq>=0 && freq<=100 && isDivisable(freq,10),"frequency must be multiple of 10 within [0 .. 100]");
    assert(reps>=1 && reps<=200 && isDivisable(reps,1),"repetitions must be int within [1 .. 200]");
    
    let upperWheel = 0;
    let lowerWheel= upperWheel+4;
    let ballHeight=lowerWheel+4;
    let dropPoint=ballHeight+4;
    let frequency=dropPoint+4;
    let repetitions=frequency+4;
    
    let buffer = new ArrayBuffer(6*4);
    let dataView = new DataView(buffer);
    let result = new Uint8Array(buffer);
    
    dataView.setUint32(upperWheel,us,true);//speed wheel
    dataView.setUint32(lowerWheel,ls,true);//speed wheel
    dataView.setFloat32(ballHeight,(bh+50)/150*50-20,true); // scale from [-50..100] to [-20..30]
    dataView.setFloat32(dropPoint,(dp+10)/20*44-22,true); // scale from [-10..10] to [-22..22]
    dataView.setFloat32(frequency,freq/100*1+0.5,true); // scale from [0..100] to [0.5 .. 1.5]
    dataView.setUint32(repetitions,reps,true);
    
    return result;
}

function parseAndValidateDrillText(drillText) {
    // Step 1: Parse the input string into an array of numbers
    const numbers = drillText.split(/[\s,]+/).filter((s)=>s.length>0).map(Number).filter(n => !isNaN(n));
    // Step 2: Check the cardinality
    if (numbers.length % 6 !== 0) {
        throw new Error(`The number of elements (${numbers.length}) must be divisible by 6.`);
    }
    // Step 3: Split the numbers into subsequences of 6
    const subsequences = [];
    for (let i = 0; i < numbers.length; i += 6) {
        subsequences.push(numbers.slice(i, i + 6));
    }
    // Step 4: Validate each subsequence
    subsequences.forEach((subseq, index) => {
        const validationError = validateSubsequence(subseq);
        if (validationError) {
            throw new Error(`Validation error in ball definition ${index + 1}: ${validationError}`);
        }
    });
    return subsequences;
}

function validateSubsequence(subseq) {
    const rules = [
        { check: (x) => Number.isInteger(x) && x >= 500 && x <= 7200, range: '500 <= x <= 7200 rpm' }, // Rule 1
        { check: (x) => Number.isInteger(x) && x >= 500 && x <= 7200, range: '500 <= x <= 7200 rpm' }, // Rule 2
        { check: (x) => Number.isInteger(x) && x >= -50 && x <= 100, range: '-50 <= x <= 100' }, // Rule 3
        { check: (x) => (x >= -10 && x <= 10) && (x * 2) % 1 === 0, range: '-10 <= x <= 10 (step size 0.5)' }, // Rule 4
        { check: (x) => (x >= 0 && x <= 100) && x % 10 === 0, range: '0% <= x <= 100% (step size 10%)' }, // Rule 5
        { check: (x) => Number.isInteger(x) && x >= 1 && x <= 200, range: '1 <= x <= 200' } // Rule 6
    ];

    for (let i = 0; i < subseq.length; i++) {
        const num = subseq[i];
        const rule = rules[i];
        if (!rule.check(num)) {
            return `Input number ${num} fails rule ${i + 1}: valid range ${rule.range}`;
        }
    }
    return null; // No validation errors
}


function createDrill(balls,combos, minutes,isRandom){
    assert(balls.length>0 && balls.length<=9,'at least one and at most 9 balls are possible');
    if(isRandom){
        combos=0;
        minutes=10;
    }
    let bytes=balls.length*24;
    let buffer=new ArrayBuffer(7+bytes);
    let dataView = new DataView(buffer);
    msg = new Uint8Array(buffer);
    dataView.setUint8(0,0x81); // new custom drill
    dataView.setUint16(1,4+bytes,true); //length of the following bytes for all balls
    dataView.setUint8(3,combos||0); // number of ball combinations to play
    dataView.setUint16(4,combos?0:minutes||3,true); // number of minutes to play
    dataView.setUint8(6,isRandom?1:0);
    for (let i = 0; i < balls.length; i++) {
        msg.set(balls[i],7+i*balls[i].length);
    }
    return Array.from(msg)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}
//////////////////// dom //////////////////////////////////////////////////////////////////
function disableButton(id){
  document.querySelector("button#"+id).setAttribute('disabled',true);
}
function enableButton(id){
  document.querySelector("button#"+id).removeAttribute('disabled');
}

//////////////////// bluetooth code ///////////////////////////////////////////////////////
async function write(arr,nextState){
    if(nextState==null || nextState == undefined)
        throw new Error("no new state specified when writing command!");
    if(!(arr instanceof Uint8Array)){
        arr = new Uint8Array(arr);
    }
    const queued = (inProgress || Promise.resolve())
        .catch((err) => {
            console.error("recovering write queue after failure", err);
        })
        .then(() => {
            console.log("writing in state: ",state,"message=",arr,"new state: ",nextState);
            state = nextState;
            return writeCharacteristic.writeValue(arr).catch((err) => {
                console.error("write failed in state: ", state, "new state:", nextState, err);
                throw err;
            });
        });
    inProgress = queued.catch(() => {});
    return queued;
};

let serviceUuid = 0xfeff;

let notifyUUID = '02f00000-0000-0000-0000-00000000ff02';
let writeUUID = '02f00000-0000-0000-0000-00000000ff01';

let td=new TextDecoder();
let te=new TextEncoder();

var notifyCharacteristic, writeCharacteristic;
var state="initial";
var inProgress=undefined;


function handleNotifications(event) {
  let value = event.target.value;
  let incomingHex = bytesToHex(value);
  console.log('> notify: ' + incomingHex, value);
  switch(state){
    case "initial":
      let serial=td.decode(value.buffer.slice(6,18)),
          code=td.decode(value.buffer.slice(18));
      var hashme=serial;
      for (var i=0;i<serial.length;i++){
        let c = serial.charCodeAt(i);
        let res = "Mjgx1jAwXDBaMFcxCz3JBgNVBAYT4kJF7Rkw"[c % 0x24];
         //console.log(c,"@",i,"->",res);
        hashme += res;
      }
      hashme += code;
      let hash = MD5(hashme);
      var msg=new Uint8Array(3+hash.length);
      msg[0]=0x08;
      msg[1]=0x20;
      msg[3]=0x00;
      msg.set(te.encode(hash),3);
      console.log("sending hash of ",hashme," = ",hash,"msg=",msg);
      write(msg,"connected 1/3");
      break;
    case "connected 1/3":
      write([1,0,0],"connected 2/3");
      break;
    case "connected 2/3":
      write([2,0,0],"connected 3/3");
      break;
    case "connected 3/3":
      wakeup(); // expected 3 messages
      break;
    case "connected 3/3 1/3":
      state = "connected 3/3 2/3";
      break;
    case "connected 3/3 2/3":
      state = "standby";
      break;
    case "standby":
      console.log("standby....")
      enableButton("shoot");
      disableButton("stop");
      disableButton("resume");
      disableButton("pause");
      break;
    case 'shooting':
      disableButton("shoot");
      enableButton("stop");
      disableButton("resume");
      enableButton("pause");
      break;
    case 'pause':
      disableButton("shoot");
      enableButton("stop");
      enableButton("resume");
      disableButton("pause");
      break;
    case 'resume':
      state='shooting';
      break;
    default:
      if('01810000'==incomingHex){
          console.error("got error answer, custom drill not accepted!");
          state='standby';
      }else {
        console.log("doing nothing, state=",state)
      }
      break;
  }
}

async function kickoffConnection(){ console.log("connecting");  return write([0x07,0,0,0],"initial");}
async function wakeup(){  console.log("wakeup");      return write([0x80,1,0,0],"connected 3/3 1/3");}
async function stop(){    console.log("stop");        return write([0x80,1,0,1],"standby");}
async function pause(){   console.log("pause");       return write([0x80,1,0,2],"pause");}
async function resume(){  console.log("resume");      return write([0x80,1,0,3],"resume");}               //us ,ls  ,bh  ,dp,freq,reps
async function shootBalls() {
    assert(state=='standby','must be in standby before starting new drill');
    console.log("shooting");
    try{
        let isRandom = document.querySelector("input#isRandom").value=='true';
        let hex = createDrill(parseAndValidateDrillText(document.querySelector('textarea#drill').value).map((arr)=>{return createBall.apply(null,arr);}),3,0,isRandom);
        return write(Uint8Array.fromHex(hex),"shooting");
    }catch(err){
       alert("Could not start drill: "+err.message);
    }
}
async function connect(){
  disableButton("connect");
  console.log('Requesting any Bluetooth Device...');
  const device = await navigator.bluetooth.requestDevice({
     filters: [{services: [0xfeff]}],
     //acceptAllDevices: true,
     optionalServices: ["02f00000-0000-0000-0000-00000000fe00"//,0x1800 //0x2a00 name of bluetooth
                        ]});
  console.log('Connecting to GATT Server...');
  const server = await device.gatt.connect();
  console.log('Getting Service...');
  const service = await server.getPrimaryService("02f00000-0000-0000-0000-00000000fe00");
  console.log('Getting Characteristic...');
  console.log(service);
  const characteristics = await service.getCharacteristics();                   
  console.log('Getting Descriptors...',characteristics);
  characteristics.forEach(characteristic => {
     if(characteristic.uuid==notifyUUID){
       notifyCharacteristic=characteristic;
       characteristic.startNotifications().then(_ => {
           console.log('> Notifications started');               
           characteristics.forEach(
             characteristic => {
               if(characteristic.uuid==writeUUID){
                 writeCharacteristic=characteristic;                     
               }
            });
            notifyCharacteristic.addEventListener('characteristicvaluechanged', handleNotifications);
            kickoffConnection(); // kick off connection by requesting serial ID and dynamic code
          });
     }
  });    
}
document.querySelector("textarea#drill").value='500, 4000,-50,6,0, 1\n1000,4000,20,5,30,1\n5000, 700,40,7,20, 1\n4500, 700,50,4,30, 1\n4800, 700,70,7,30, 1\n4000, 700,100,2,20, 1';
disableButton("shoot");
disableButton("pause");
disableButton("resume");
disableButton("stop");
