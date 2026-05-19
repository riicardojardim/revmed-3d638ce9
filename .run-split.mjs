import {detectCodeSplitGroupingsFromRoute} from '@tanstack/router-plugin/core';
import fs from 'fs';
const code=fs.readFileSync('/dev-server/src/routes/app.sala.$code.candidato.tsx','utf8');
try{
  const r=detectCodeSplitGroupingsFromRoute({code, filename:'/dev-server/src/routes/app.sala.$code.candidato.tsx'});
  console.log('OK', Object.keys(r));
}catch(e){console.log('ERR',e.message,'@',e.loc); if(e.pluginCode){fs.writeFileSync('/tmp/plugincode.txt',e.pluginCode); console.log('saved',e.pluginCode.length);}}
