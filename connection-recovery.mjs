// Browser-side cleanup only. No radio bytes, reboot opcode or automatic reconnect.
export function releaseAfterAcknowledgedWrite(radio){
 const report=radio.report;
 if(radio.busy||report.stage!=='written-unverified'||report.totalBlocks!==262||report.acknowledged!==262)throw Error('Post-write cleanup requires all 262 acknowledgements and an idle writer.');
 report.browserLinkCleanup={requestedAt:Date.now(),outcome:'requested'};
 try{
  radio.disconnect();
  report.browserLinkCleanup.outcome='browser-disconnect-requested';
  radio.log('All 262 write blocks acknowledged; browser Bluetooth disconnect requested. Wait for the radio to finish rebooting before reconnecting.');
 }catch(e){
  report.browserLinkCleanup.outcome='cleanup-failed';report.browserLinkCleanup.error=e.message;
  radio.log('Write blocks acknowledged, but browser connection cleanup failed: '+e.message+'. No write will be retried.');
 }
}
