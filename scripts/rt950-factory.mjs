// Field offsets, masks and menu values cross-checked against Radtel Pro CPS 1.3.3.
// Offsets are relative to the start of each section. Menu values use the radio’s stored order.
const onOff = ["Off", "On"];
const pTTIDChoices = ["Off", "BOT", "EOT", "BOTH"];
const displayModeAChoices = ["Name", "Frequency", "Channel Num"];
const passRepetNoiseClearChoices = ["Off", "100ms", "200ms", "300ms", "400ms", "500ms", "600ms", "700ms", "800ms", "900ms", "1000ms"];
const workModeAChoices = ["VFO Mode", "CH Mode"];
const keySide1Choices = ["Radio", "Moni", "Scan", "Search", "SOS", "Spectrum", "BeaconTx", "PTTC"];
const keySide2Choices = ["Radio", "Moni", "Scan", "Search", "SOS", "Spectrum", "BeaconTx"];
const curWorkZoneAChoices = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];
const key0LChoices = ["None", "Radio", "Vox", "Search", "Spectrum", "Noaa", "Scan QT", "Squelch", "Freq Step", "Tx Power", "CH Memory", "Zone Select", "Standby Set", "Ctcss Dcs", "Freq Offset", "Freq Dir", "Rx Modulation", "Tone Tx", "Transfer", "GPS Switch", "APRS Switch", "Roger", "BT Write Freq"];
const lastTimeSendChoices = ["50ms", "100ms", "200ms", "300ms", "500ms"];
const sSIDChoices = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];
const aMRxGainChoices = ["AGC", "0dB", "-1dB", "-2dB", "-3dB", "-4dB", "-5dB", "-6dB", "-7dB", "-8dB", "-9dB", "-10dB", "-11dB", "-12dB", "-13dB", "-14dB", "-15dB", "-16dB", "-17dB", "-18dB", "-19dB", "-20dB", "-21dB", "-22dB", "-23dB", "-24dB", "-25dB", "-26dB", "-27dB", "-28dB", "-29dB", "-30dB", "-31dB", "-32dB", "-33dB", "-34dB", "-35dB"];

export const functionChoices = [
  ["SQL", "SQL Level", 0, ["Off", "Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7", "Level 8", "Level 9"]],
  ["SaveMode", "Battery Save", 1, ["Off", "Normal", "Super", "Deep"]],
  ["VOX", "VOX Level", 2, ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7", "Level 8", "Level 9"]],
  ["AutoBacklight", "Auto Backlight", 3, ["Bright", "5sec", "10sec", "15sec", "20sec", "30sec", "1min", "2min", "3min"]],
  ["TDR", "Standby", 4, onOff],
  ["TOT", "TOT", 5, ["Off", "30sec", "60sec", "90sec", "120sec", "150sec", "180sec", "210sec", "240sec"]],
  ["BeepPrompt", "Beep Prompt", 6, onOff],
  ["VoicePrompt", "Voice Prompt", 7, onOff],
  ["Language", "Language", 8, ["English", "中文 (Chinese)"]],
  ["DTMF", "DTMF ST", 9, ["Off", "DT-ST", "ANI-ST", "DT+ANI"]],
  ["Scan", "Scan Mode", 10, ["TO Time", "CO Carrier", "SE Search"]],
  ["PTTID", "PTT-ID", 11, pTTIDChoices],
  ["SendIDDelay", "Send ID Delay", 12, ["0ms", "100ms", "200ms", "400ms", "600ms", "800ms", "1000ms"]],
  ["DisplayModeA", "Display Mode A", 13, displayModeAChoices],
  ["DisplayModeB", "Display Mode B", 14, displayModeAChoices],
  ["DisplayModeC", "Display Mode C", 15, displayModeAChoices],
  ["AutoKeyLock", "Auto Keypad Lock", 16, ["Off", "5sec", "10sec", "15sec"]],
  ["AlarmMode", "SOS Mode", 17, ["On Site", "Send Sound", "Send Code"]],
  ["AlarmSound", "Alarm Sound", 18, onOff],
  ["TailNoiseClear", "Tail", 20, onOff],
  ["PassRepetNoiseClear", "RP-STE", 21, passRepetNoiseClearChoices],
  ["PassRepetNoiseDetect", "RPT-RL", 22, passRepetNoiseClearChoices],
  ["SoundTxEnd", "Tx Tail Sound", 23, ["Off", "Beep", "Tone1200"]],
  ["CurWorkMode", "Current work band", 24, ["A-Band", "B-Band", "C-Band"]],
  ["FMRadio", "FM Radio", 25, ["On", "Off"]],
  ["WorkModeA", "Work Mode A", 26, workModeAChoices, 0x3],
  ["WorkModeB", "Work Mode B", 26, workModeAChoices, 0xc, 2],
  ["WorkModeC", "Work Mode C", 26, workModeAChoices, 0x30, 4],
  ["LockKeyBoard", "Keypad Lock", 27, onOff],
  ["PowerMsg", "Power Msg", 28, ["Preset Icons", "Battery Voltage"]],
  ["BTWriteSwitch", "BT Write Switch", 29, onOff],
  ["RTone", "R-Tone", 30, ["1000Hz", "1450Hz", "1750Hz", "2100Hz"]],
  ["VoxDelay", "VOX Delay", 32, ["0.5sec", "0.6sec", "0.7sec", "0.8sec", "0.9sec", "1.0sec", "1.1sec", "1.2sec", "1.3sec", "1.4sec", "1.5sec", "1.6sec", "1.7sec", "1.8sec", "1.9sec", "2.0sec"]],
  ["MenuExitTime", "Menu Exit Time", 33, ["5sec", "10sec", "15sec", "20sec", "25sec", "30sec", "35sec", "40sec", "45sec", "50sec", "60sec"]],
  ["PowerOnDelayTime", "PowerOn DelayTime", 36, ["0.2sec", "0.4sec", "0.6sec", "0.8sec", "1.0sec", "1.2sec", "1.4sec", "1.6sec", "1.8sec", "2.0sec", "2.2sec", "2.4sec", "2.6sec", "2.8sec", "3.0sec"]],
  ["WeatherCH", "Weather Channel", 37, ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]],
  ["DivideCH", "Channel Divide", 38, ["Zone CH Mode", "All CH Mode"]],
  ["SubaudioScanSave", "Subaudio ScanSave", 39, ["All", "Rx", "Tx"]],
  ["VOXSwitch", "VOX Switch", 40, onOff],
  ["KeySide1", "PF1 Short", 41, keySide1Choices],
  ["KeySide1L", "PF1 Long", 42, keySide1Choices],
  ["KeySide2", "PF2 Short", 43, keySide2Choices],
  ["KeySide2L", "PF2 Long", 44, keySide2Choices],
  ["CurWorkZoneA", "Cur Work Zone A", 45, curWorkZoneAChoices],
  ["CurWorkZoneB", "Cur Work Zone B", 46, curWorkZoneAChoices],
  ["CurWorkZoneC", "Cur Work Zone C", 47, curWorkZoneAChoices],
  ["ABUVTransfer", "AB-UV Transfer", 57, onOff],
  ["SoundTransfer", "Sound Transfer", 58, onOff],
  ["Key0L", "Key [0] Long", 59, key0LChoices, 0x1f],
  ["Key1L", "Key [1] Long", 60, key0LChoices, 0x1f],
  ["Key2L", "Key [2] Long", 61, key0LChoices, 0x1f],
  ["Key3L", "Key [3] Long", 62, key0LChoices, 0x1f],
  ["Key4L", "Key [4] Long", 63, key0LChoices, 0x1f],
  ["Key5L", "Key [5] Long", 64, key0LChoices, 0x1f],
  ["Key6L", "Key [6] Long", 65, key0LChoices, 0x1f],
  ["Key7L", "Key [7] Long", 66, key0LChoices, 0x1f],
  ["Key8L", "Key [8] Long", 67, key0LChoices, 0x1f],
  ["Key9L", "Key [9] Long", 68, key0LChoices, 0x1f],
  ["RadioRxInterruption", "Radio RX interrupted", 69, onOff],
  ["BreathingLight", "Breathing Light", 70, onOff],
  ["NoaaAlarm", "NOAA Alarm", 71, onOff],
  ["RadioBacklight", "Radio Backlight", 72, onOff],
];

export const vfoChoices = [
  ["BusyLockout", "Busy lockout", 13, onOff],
  ["OffsetDir", "Offset direction", 14, ["None", "Plus", "Minus"], 0x30, 4],
  ["SignallingGroup", "Signalling", 14, curWorkZoneAChoices],
  ["TxPower", "TX power", 16, ["High", "Middle", "Low"]],
  ["Scram", "Scramble", 16, ["Off", "Scramble 1", "Scramble 2", "Scramble 3", "Scramble 4", "Scramble 5", "Scramble 6", "Scramble 7", "Scramble 8"], 0xf0, 4],
  ["BandWide", "Bandwidth", 17, ["Wide", "Narrow"], 0x40, 6],
  ["Encrypt", "Encryption", 17, ["Off", "Encryption 1", "Encryption 2", "Encryption 3"], 0x30, 4],
  ["RxModulation", "RX modulation", 17, ["FM", "AM"], 0x3],
  ["FreqBand", "Frequency band", 18, ["VHF", "UHF"]],
  ["StepFreq", "Step frequency", 19, ["2.5KHz", "5.0KHz", "6.25KHz", "8.33KHz", "10.0KHz", "12.5KHz", "20.0KHz", "25.0KHz", "50.0KHz", "100.0KHz"]],
];

export const dtmfChoices = [
  ["PTTID", "PTT-ID", 6, pTTIDChoices],
  ["LastTimeSend", "DTMF speed (on time)", 7, lastTimeSendChoices],
  ["LastTimeStop", "DTMF speed (off time)", 8, lastTimeSendChoices],
];

export const aprsChoices = [
  ["AprsSwitch", "APRS Switch", 0, onOff],
  ["GpsSwitch", "GPS Switch", 1, onOff],
  ["LatitudeLongitudeUnit", "Latitude Longitude Unit", 2, ["Degree", "Degree Minute", "Degree Minute Second"]],
  ["SpeedUnit", "Speed Unit", 3, ["Kilometers/Hour", "NauticalMiles/Hour", "Miles/Hour"]],
  ["DistanceUnit", "Distance Unit", 4, ["Kilometer", "NauticalMile", "Mile"]],
  ["AltitudeUnit", "Altitude Unit", 5, ["Meter", "Foot"]],
  ["TimeZone", "Time Zone", 6, ["-12", "-11", "-10", "-9", "-8", "-7", "-6", "-5", "-4", "-3", "-2", "-1", "0", "+1", "+2", "+3", "+4", "+5", "+6", "+7", "+8", "+9", "+10", "+11", "+12", "+13", "+14"], 0x1f],
  ["SSID", "SSID", 23, sSIDChoices],
  ["RoutingSelect", "Routing Select", 24, ["Off", "WIDE1-1", "WIDE1-1,WIDE2-1", "PATH1", "PATH1,PATH2"]],
  ["SiteType", "Site Type", 25, ["Fixed Coordinates", "GPS Coordinates"]],
  ["RadioSymbol", "Radio Symbol", 26, ["[/[] Pedestrians", "[/b] Bicycles", "[/>] Cars", "[/R] RecreationalVehicles", "USER UserDefined"]],
  ["UserDefinedIcon", "User Defined Icon", 27, ["Police", "[/\\\"]", "Digi", "Phone", "DX Cluster", "HF Gateway", "S-Aricraft", "Mobile Satellite", "Wheelchair", "Snowmobile", "Red Cross", "Boy Scouts", "House QTH(VHF)", "X", "Red Dot", "[/0]", "[/1]", "[/2]", "[/3]", "[/4]", "[/5]", "[/6]", "[/7]", "[/8]", "[/9]", "Fire", "Campground", "Motorcycle", "Railroad", "File Server", "HC Future", "Aid Station", "BBS", "Canoe", "[/D]", "Eyeball", "Farm Vehicle", "Grid Square", "Hotel", "TCP/IP", "[/J]", "School", "PC user", "MacAPRS", "NTS Station", "Balloon", "Police", "[/Q]", "REC.Vehicle", "Space Shuttle", "SSTV", "Bus", "ATV", "NWS Site", "Helicopter", "Yacht", "WinAPRS", "Triangle", "MAIL", "Aircraft", "WX Station", "Dish Antenna", "Ambulance", "Command Post", "Fire dept", "Horse", "Fire Truck", "Glider", "Hospital", "IOTA", "Jeep", "Truck", "Laptop", "Node", "EOC", "Rover", "[/q]", "Repeater", "Ship", "Truck Stop", "Truck(18Wheel)", "Van", "Water Station", "X-APRS(Unix)", "Yagi@QTH", "[/z]", "[/{]", "[/I]", "[/}]", "[/~]"], 0x7f],
  ["AprsWorkingCH", "APRS Working Channel", 28, ["CH/VFO A", "CH/VFO B", "CH/VFO C"]],
  ["AprsPriority", "APRS Priority", 29, ["Call", "APRS"]],
  ["DataTxDelay", "Data Tx Delay", 30, ["100 ms", "150 ms", "200 ms", "250 ms", "300 ms", "400 ms", "500 ms", "750 ms", "1000 ms"]],
  ["AprsCHMute", "APRS Channel Mute", 31, onOff],
  ["AprsDecodePromptTone", "APRS Decode Prompt Tone", 32, onOff],
  ["AprsRxAutoPopUp", "APRS Rx Auto Pop Up", 33, onOff],
  ["BeaconTxType", "Beacon Tx Type", 34, ["Manually Send", "Scheduled Beacon"]],
  ["TimedBeaconTime", "Timed Beacon Time", 36, ["30 sec", "1 min", "2 min", "3 min", "5 min", "10 min", "15 min", "20 min", "30 min", "60 min"]],
  ["MicEType", "MicE Type", 38, ["Off Duty", "Enroute", "In Service", "Returning", "Committed", "Special", "Priority", "Emergency"]],
  ["TncDataType", "TNC Data Type", 39, ["Off", "KISS"]],
  ["AprsForwardChannel", "APRS Forward Channel", 40, ["CH A", "CH B", "CH A + CH B"]],
  ["AprsForwardRouting", "APRS Forward Routing", 41, ["Off", "WIDE1", "WIDE1,WIDE2", "PATH1", "PATH1,PATH2"]],
  ["AprsWaitForward", "APRS Wait Forward", 42, ["0 sec", "1 sec", "2 sec", "3 sec", "4 sec", "5 sec", "6 sec", "7 sec", "8 sec", "9 sec"]],
  ["CustomRoutingOneSSID", "Custom Routing 1 SSID", 49, sSIDChoices],
  ["CustomRoutingTwoSSID", "Custom Routing 2 SSID", 56, sSIDChoices],
  ["SendCustomMessages", "Send Custom Messages", 78, onOff],
  ["AprsTxDataReporting", "APRS Tx Data Reporting", 119, onOff],
  ["BeaconPopUpTime", "Beacon Pop Up Time", 120, ["5 sec", "10 sec", "20 sec", "30 sec", "60 sec", "Manual"]],
];

export const receiverChoices = [
  ["FMCurChID", "FM Current CH", 32, curWorkZoneAChoices, 0xff],
  ["WorkMode", "Work Mode", 33, workModeAChoices, 0xff],
  ["AMCurChID", "AM Current CH", 66, curWorkZoneAChoices, 0xff],
  ["ModulationMode", "Modulation Mode", 67, ["FM", "AM", "LSB", "USB", "CW"], 0xff],
  ["AMRxGain", "AM Rx Gain", 68, aMRxGainChoices, 0xff],
  ["SSBCurChID", "SSB Current CH", 149, curWorkZoneAChoices, 0xff],
  ["SSBStepFreq", "SSB Step Freq", 150, ["1K", "5K", "10K", "100K", "500K", "1000K"], 0xff],
  ["AMStepFreq", "AM Step Freq", 151, ["1K", "5K", "10K", "100K"], 0xff],
  ["SSBRxGain", "SSB Rx Gain", 152, aMRxGainChoices, 0xff],
];
