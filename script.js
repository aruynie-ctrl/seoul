const WEATHER_FILE = 'weather.csv';
const weatherNames = {0:['맑음','☀️'],1:['대체로 맑음','🌤️'],2:['부분적으로 흐림','⛅'],3:['흐림','☁️'],45:['안개','🌫️'],51:['이슬비','🌦️'],61:['비','🌧️'],71:['눈','🌨️'],80:['소나기','🌦️'],95:['뇌우','⛈️']};
const $ = id => document.getElementById(id);
const number = (value, digits=1) => Number(value).toFixed(digits).replace('.0','');
const parseCSV = text => { const [header,...rows] = text.trim().split(/\r?\n/); const keys=header.split(','); return rows.filter(Boolean).map(row=>{const cells=row.split(',');return Object.fromEntries(keys.map((key,i)=>[key,cells[i]]));}); };
const formatTime = iso => new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(iso));
function render(rows){
  rows.sort((a,b)=>new Date(a.time)-new Date(b.time)); const current=rows.at(-1), previous=rows.at(-2); if(!current)return;
  const [name,icon]=weatherNames[current.weather_code]||['관측 중','🌡️']; $('weatherIcon').textContent=icon; $('weatherText').textContent=name; $('temperature').textContent=`${number(current.temperature_2m)}°`; $('apparent').textContent=`${number(current.apparent_temperature)}°`; $('humidity').textContent=`${number(current.relative_humidity_2m,0)}%`; $('rain').textContent=`${number(current.precipitation)} mm`; $('wind').textContent=`${number(current.wind_speed_10m)} km/h`; $('updatedAt').textContent=`${formatTime(current.time)} 기준`;
  $('currentTemp').textContent=`${number(current.temperature_2m)}°`; $('currentTime').textContent=formatTime(current.time);
  if(previous){ const delta=Number(current.temperature_2m)-Number(previous.temperature_2m); $('previousTemp').textContent=`${number(previous.temperature_2m)}°`; $('previousTime').textContent=formatTime(previous.time); $('trendBadge').textContent=delta>0?'상승 중':delta<0?'하락 중':'변화 없음'; $('trendMessage').textContent=`이전 관측보다 기온이 ${delta===0?'변화 없이 유지되고':`${number(Math.abs(delta))}° ${delta>0?'올랐':'내렸'}습니다.`}`; } else { $('previousTemp').textContent='없음'; $('previousTime').textContent='추가 데이터 필요'; $('trendBadge').textContent='데이터 부족'; $('trendMessage').textContent='변화를 비교하려면 weather.csv에 관측값이 2개 이상 필요합니다.'; }
}
fetch(WEATHER_FILE).then(r=>{if(!r.ok)throw new Error('CSV를 찾을 수 없습니다.');return r.text()}).then(text=>render(parseCSV(text))).catch(err=>{$('updatedAt').textContent=err.message;$('trendMessage').textContent='로컬 서버에서 실행하면 CSV를 불러올 수 있습니다.';});
