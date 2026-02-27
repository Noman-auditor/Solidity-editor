import { useState, useEffect, useRef } from "react";

const KEYWORDS = new Set(["pragma","solidity","contract","library","interface","function","modifier","event","struct","enum","mapping","returns","return","if","else","for","while","do","break","continue","new","delete","emit","import","is","using","assembly","public","private","internal","external","pure","view","payable","nonpayable","memory","storage","calldata","indexed","override","virtual","abstract","constructor","fallback","receive","try","catch","revert","require","assert"]);
const TYPES = new Set(["uint","uint8","uint16","uint32","uint64","uint128","uint256","int","int8","int16","int32","int64","int128","int256","bool","address","bytes","bytes1","bytes2","bytes4","bytes8","bytes16","bytes32","string","tuple"]);
const BUILTINS = new Set(["msg","block","tx","abi","this","super","selfdestruct","keccak256","sha256","ecrecover","addmod","mulmod","gasleft","blockhash","transfer","send","call","delegatecall","staticcall","push","pop","length"]);
const CONSTANTS = new Set(["true","false","wei","gwei","ether","seconds","minutes","hours","days","weeks"]);

function tokenize(line) {
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '/' && line[i+1] === '/') { tokens.push({ type:'comment', value: line.slice(i) }); break; }
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i]; let j = i+1;
      while (j < line.length && line[j] !== q) j++;
      tokens.push({ type:'string', value: line.slice(i, j+1) }); i = j+1; continue;
    }
    if (/[0-9]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[0-9a-fA-FxX_.]/.test(line[j])) j++;
      tokens.push({ type:'number', value: line.slice(i, j) }); i = j; continue;
    }
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      let type = 'ident';
      if (KEYWORDS.has(word)) type = 'keyword';
      else if (TYPES.has(word) || /^(uint|int|bytes)\d+$/.test(word)) type = 'type';
      else if (BUILTINS.has(word)) type = 'builtin';
      else if (CONSTANTS.has(word)) type = 'constant';
      else if (/^[A-Z]/.test(word)) type = 'classname';
      let k = j; while (k < line.length && line[k] === ' ') k++;
      if (line[k] === '(' && type === 'ident') type = 'func';
      tokens.push({ type, value: word }); i = j; continue;
    }
    if (/[=!<>+\-*/%&|^~]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[=!<>+\-*/%&|^~]/.test(line[j])) j++;
      tokens.push({ type:'operator', value: line.slice(i, j) }); i = j; continue;
    }
    if (/[{}()[\];:,.]/.test(line[i])) { tokens.push({ type:'punct', value: line[i] }); i++; continue; }
    tokens.push({ type:'plain', value: line[i] }); i++;
  }
  return tokens;
}

const TC = { keyword:'#ff79c6', type:'#8be9fd', builtin:'#50fa7b', constant:'#bd93f9', classname:'#f1fa8c', func:'#50fa7b', string:'#f1fa8c', number:'#bd93f9', comment:'#6272a4', operator:'#ff79c6', punct:'#f8f8f2', ident:'#f8f8f2', plain:'#f8f8f2' };

function HighlightLine({ line }) {
  if (!line) return <span>&nbsp;</span>;
  return <>{tokenize(line).map((t,i) => <span key={i} style={{color: TC[t.type]||'#f8f8f2'}}>{t.value}</span>)}</>;
}

const AUTOCOMPLETE_LIST = ["pragma solidity","contract","function","constructor","modifier","event","struct","mapping","address","uint256","uint8","bool","string","bytes32","memory","storage","calldata","public","private","internal","external","view","pure","payable","returns","require","emit","revert","msg.sender","msg.value","block.timestamp","block.number","address(0)","keccak256","abi.encodePacked","override","virtual","indexed"];

const TEMPLATES = {
  counter: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Counter {
    uint256 private count;
    address public owner;

    event CountChanged(uint256 newCount, address changedBy);

    constructor() {
        owner = msg.sender;
        count = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    function increment() public {
        count += 1;
        emit CountChanged(count, msg.sender);
    }

    function decrement() public {
        require(count > 0, "Counter: cannot go below 0");
        count -= 1;
        emit CountChanged(count, msg.sender);
    }

    function reset() public onlyOwner {
        count = 0;
        emit CountChanged(count, msg.sender);
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}`,
  erc20: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ERC20Token {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint256 _supply) {
        name = _name;
        symbol = _symbol;
        owner = msg.sender;
        totalSupply = _supply * 10 ** decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
}`,
  nft: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleNFT {
    string public name = "MyNFT";
    string public symbol = "MNFT";
    address public owner;
    uint256 private _nextTokenId;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function mint(address to, string memory uri) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _balances[to]++;
        _tokenURIs[tokenId] = uri;
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _owners[tokenId];
    }

    function balanceOf(address addr) public view returns (uint256) {
        return _balances[addr];
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        return _tokenURIs[tokenId];
    }

    function totalSupply() public view returns (uint256) {
        return _nextTokenId;
    }
}`,
  voting: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    address public chairperson;
    mapping(address => bool) public hasVoted;
    Candidate[] public candidates;
    bool public votingOpen;

    event Voted(address indexed voter, uint256 indexed candidateIndex);
    event VotingEnded(string winner, uint256 votes);

    constructor(string[] memory candidateNames) {
        chairperson = msg.sender;
        votingOpen = true;
        for (uint i = 0; i < candidateNames.length; i++) {
            candidates.push(Candidate(candidateNames[i], 0));
        }
    }

    modifier onlyChair() {
        require(msg.sender == chairperson, "Only chairperson");
        _;
    }

    function vote(uint256 index) public {
        require(votingOpen, "Voting closed");
        require(!hasVoted[msg.sender], "Already voted");
        require(index < candidates.length, "Invalid candidate");
        hasVoted[msg.sender] = true;
        candidates[index].voteCount++;
        emit Voted(msg.sender, index);
    }

    function endVoting() public onlyChair {
        votingOpen = false;
        (string memory w, uint256 v) = getWinner();
        emit VotingEnded(w, v);
    }

    function getWinner() public view returns (string memory, uint256) {
        uint256 max = 0; uint256 idx = 0;
        for (uint i = 0; i < candidates.length; i++) {
            if (candidates[i].voteCount > max) { max = candidates[i].voteCount; idx = i; }
        }
        return (candidates[idx].name, candidates[idx].voteCount);
    }
}`,
  blank: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // Write your code here
}`,
};

const LOG_COLORS = { success:"#50fa7b", error:"#ff5555", warning:"#ffb86c", info:"#8be9fd", plain:"#f8f8f2" };

export default function SolidityIDE() {
  const [code, setCode] = useState(TEMPLATES.counter);
  const [tab, setTab] = useState("console");
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [compiling, setCompiling] = useState(false);
  const [status, setStatus] = useState({ text:"Ready", dot:"#6272a4" });
  const [cursor, setCursor] = useState({ ln:1, col:1 });
  const [activeTemplate, setActiveTemplate] = useState("counter");
  const [suggestions, setSuggestions] = useState([]);
  const [suggIdx, setSuggIdx] = useState(0);
  const [suggPos, setSuggPos] = useState({ top:0, left:0 });
  const [showSugg, setShowSugg] = useState(false);

  const taRef = useRef(null);
  const hlRef = useRef(null);
  const lnRef = useRef(null);

  const lines = code.split("\n");

  const syncScroll = () => {
    if (hlRef.current && taRef.current) { hlRef.current.scrollTop = taRef.current.scrollTop; hlRef.current.scrollLeft = taRef.current.scrollLeft; }
    if (lnRef.current && taRef.current) lnRef.current.scrollTop = taRef.current.scrollTop;
  };

  const updateCursor = () => {
    if (!taRef.current) return;
    const pos = taRef.current.selectionStart;
    const before = code.substring(0, pos).split("\n");
    setCursor({ ln: before.length, col: before[before.length-1].length+1 });
  };

  const triggerAC = (val, pos) => {
    const before = val.substring(0, pos);
    const match = before.match(/[\w.]+$/);
    if (!match || match[0].length < 2) { setShowSugg(false); return; }
    const word = match[0].toLowerCase();
    const filtered = AUTOCOMPLETE_LIST.filter(s => s.toLowerCase().startsWith(word) && s.toLowerCase() !== word);
    if (!filtered.length) { setShowSugg(false); return; }
    const ta = taRef.current;
    const linesBefore = before.split("\n");
    const lnum = linesBefore.length;
    const lineH = 22;
    const top = lnum * lineH - ta.scrollTop + 2;
    const charW = 9.6;
    const col = linesBefore[linesBefore.length-1].length;
    const left = (col - match[0].length) * charW + 46;
    setSuggestions(filtered.slice(0,8));
    setSuggIdx(0);
    setSuggPos({ top, left });
    setShowSugg(true);
  };

  const applyAC = (s) => {
    if (!taRef.current) return;
    const pos = taRef.current.selectionStart;
    const before = code.substring(0, pos);
    const after = code.substring(pos);
    const match = before.match(/[\w.]+$/);
    if (!match) return;
    const prefix = before.slice(0, before.length - match[0].length);
    const newCode = prefix + s + after;
    setCode(newCode);
    setShowSugg(false);
    setTimeout(() => { if (taRef.current) { const p = prefix.length + s.length; taRef.current.selectionStart = taRef.current.selectionEnd = p; taRef.current.focus(); } }, 0);
  };

  const handleKeyDown = (e) => {
    if (showSugg) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSuggIdx(i => Math.min(i+1, suggestions.length-1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSuggIdx(i => Math.max(i-1,0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); applyAC(suggestions[suggIdx]); return; }
      if (e.key === "Escape") { setShowSugg(false); return; }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const s = taRef.current.selectionStart, end = taRef.current.selectionEnd;
      const n = code.substring(0,s) + "    " + code.substring(end);
      setCode(n);
      setTimeout(() => { if(taRef.current){taRef.current.selectionStart=taRef.current.selectionEnd=s+4;} },0);
      return;
    }
    const pairs = {'{':'}','(':')','[':']','"':'"',"'":"'"};
    if (pairs[e.key]) {
      e.preventDefault();
      const s = taRef.current.selectionStart, end = taRef.current.selectionEnd;
      const sel = code.substring(s, end);
      const n = code.substring(0,s) + e.key + sel + pairs[e.key] + code.substring(end);
      setCode(n);
      setTimeout(() => { if(taRef.current){taRef.current.selectionStart=taRef.current.selectionEnd=s+1;} },0);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const s = taRef.current.selectionStart;
      const lineStart = code.lastIndexOf('\n', s-1)+1;
      const currentLine = code.substring(lineStart, s);
      const indent = currentLine.match(/^(\s*)/)[1];
      const extra = currentLine.trimEnd().endsWith('{') ? "    " : "";
      const ins = "\n" + indent + extra;
      const n = code.substring(0,s) + ins + code.substring(s);
      setCode(n);
      setTimeout(() => { if(taRef.current){const p=s+ins.length;taRef.current.selectionStart=taRef.current.selectionEnd=p;} },0);
    }
    if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); compile(); }
  };

  const handleChange = (e) => {
    setCode(e.target.value);
    updateCursor();
    triggerAC(e.target.value, e.target.selectionStart);
  };

  const mkLog = (type, icon, text) => ({ type, icon, text, time: new Date().toLocaleTimeString("en-GB",{hour12:false}), id: Math.random() });

  const compile = async () => {
    if (!code.trim() || compiling) return;
    setCompiling(true);
    setResult(null);
    setTab("console");
    setStatus({ text:"AI Compiling...", dot:"#ffd166" });
    setLogs([mkLog("info","🤖","Claude AI Solidity Compiler starting..."), mkLog("info","⬡","Sending code for deep analysis & security audit...")]);

    const prompt = `You are an expert Solidity compiler and smart contract security auditor. Analyze the Solidity code below and return ONLY a raw JSON object — no markdown, no backticks, no extra text.

JSON structure:
{
  "success": boolean,
  "contractName": "string",
  "pragma": "string",
  "license": "string or null",
  "errors": ["error with line info if possible"],
  "warnings": ["warnings"],
  "functions": [{"name":"","visibility":"","mutability":"","params":"","returns":""}],
  "events": [{"name":"","params":""}],
  "stateVars": [{"name":"","type":"","visibility":""}],
  "modifiers": ["names"],
  "hasConstructor": boolean,
  "constructorParams": "string",
  "gasEstimates": {"deployment":"range","functions":{"fnName":"range"}},
  "securityIssues": ["detailed security issues"],
  "suggestions": ["improvement suggestions"],
  "summary": "2-3 sentence summary"
}

Code:
${code}

Return ONLY valid JSON.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:3000, messages:[{role:"user",content:prompt}] })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.error?.message || `HTTP ${res.status}`); }
      const data = await res.json();
      const raw = data.content.map(b=>b.text||"").join("").trim().replace(/^```[\w]*\n?/,"").replace(/```$/,"").trim();
      const r = JSON.parse(raw);
      setResult(r);
      const nl = [];
      if (!r.success || r.errors?.length > 0) {
        nl.push(mkLog("error","✖",`Compilation FAILED — ${r.contractName||"Unknown"}`));
        (r.errors||[]).forEach(e=>nl.push(mkLog("error","  ✖",e)));
        (r.warnings||[]).forEach(w=>nl.push(mkLog("warning","  ⚠",w)));
        setStatus({text:"Compilation Failed", dot:"#ff5555"});
      } else {
        nl.push(mkLog("success","✔",`Contract "${r.contractName}" compiled successfully!`));
        nl.push(mkLog("success","✔",`Pragma: ${r.pragma}`));
        if(r.license) nl.push(mkLog("plain","📄",`License: ${r.license}`));
        nl.push(mkLog("info","📋",`Functions: ${(r.functions||[]).length} | Events: ${(r.events||[]).length} | State Vars: ${(r.stateVars||[]).length} | Modifiers: ${(r.modifiers||[]).length}`));
        if(r.gasEstimates?.deployment) nl.push(mkLog("info","⛽",`Estimated deployment gas: ${r.gasEstimates.deployment}`));
        (r.warnings||[]).forEach(w=>nl.push(mkLog("warning","⚠",w)));
        if(r.securityIssues?.length>0){ nl.push(mkLog("error","🔒",`${r.securityIssues.length} security issue(s) found:`)); r.securityIssues.forEach(s=>nl.push(mkLog("error","  ›",s))); }
        else nl.push(mkLog("success","🔒","Security audit passed — no issues found."));
        if(r.suggestions?.length>0){ nl.push(mkLog("plain","💡","Suggestions:")); r.suggestions.forEach(s=>nl.push(mkLog("plain","  ›",s))); }
        if(r.summary) nl.push(mkLog("info","📝",r.summary));
        nl.push(mkLog("success","⬡","AI compilation & audit complete."));
        setStatus({text:"Compiled OK ✔", dot:"#50fa7b"});
      }
      setLogs(nl);
    } catch(err) {
      setLogs([mkLog("error","✖",`Compiler error: ${err.message}`)]);
      setStatus({text:"Error", dot:"#ff5555"});
    }
    setCompiling(false);
  };

  const loadTemplate = (key) => {
    setCode(TEMPLATES[key]); setActiveTemplate(key);
    setLogs([]); setResult(null); setShowSugg(false);
    setStatus({text:"Ready", dot:"#6272a4"});
  };

  return (
    <div style={{background:"#282a36",color:"#f8f8f2",fontFamily:"'JetBrains Mono','Fira Code','Courier New',monospace",height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden",fontSize:13}}>

      {/* HEADER */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px",height:46,background:"#21222c",borderBottom:"1px solid #44475a",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,background:"linear-gradient(135deg,#8be9fd,#bd93f9)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:"bold"}}>⬡</div>
          <span style={{fontWeight:700,fontSize:15}}>Solidity<span style={{color:"#8be9fd"}}>IDE</span></span>
          <span style={{fontSize:"0.58rem",padding:"2px 8px",borderRadius:10,border:"1px solid #44475a",color:"#6272a4",letterSpacing:1}}>AI POWERED</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:"0.58rem",padding:"2px 8px",borderRadius:10,border:"1px solid #44475a",color:"#6272a4"}}>v0.8.x</span>
          <button onClick={compile} disabled={compiling} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 18px",background:compiling?"#44475a":"linear-gradient(135deg,#50fa7b,#00c896)",color:"#1a1a2e",border:"none",borderRadius:6,fontWeight:700,fontSize:13,cursor:compiling?"not-allowed":"pointer",fontFamily:"inherit",transition:"all 0.2s",boxShadow:compiling?"none":"0 2px 12px rgba(80,250,123,0.3)"}}>
            {compiling ? "⏳ Analyzing..." : "▶ Compile & Analyze"}
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* SIDEBAR */}
        <div style={{width:185,background:"#21222c",borderRight:"1px solid #44475a",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"10px 12px 4px",fontSize:"0.58rem",letterSpacing:2,color:"#6272a4",textTransform:"uppercase"}}>Explorer</div>
          <div style={{padding:"2px 8px 10px",borderBottom:"1px solid #44475a"}}>
            <div style={{padding:"5px 8px",borderRadius:4,background:"rgba(139,233,253,0.08)",color:"#8be9fd",fontSize:"0.72rem",borderLeft:"2px solid #8be9fd",display:"flex",alignItems:"center",gap:6}}>
              <span>📄</span> Contract.sol
            </div>
          </div>
          <div style={{padding:"10px 12px 4px",fontSize:"0.58rem",letterSpacing:2,color:"#6272a4",textTransform:"uppercase"}}>Templates</div>
          <div style={{padding:"0 8px",flex:1,overflowY:"auto"}}>
            {[["counter","🔢","Counter"],["erc20","🪙","ERC-20 Token"],["nft","🖼️","ERC-721 NFT"],["voting","🗳️","Voting"],["blank","📋","Blank"]].map(([k,icon,label])=>(
              <button key={k} onClick={()=>loadTemplate(k)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 8px",background:activeTemplate===k?"rgba(139,233,253,0.08)":"transparent",border:activeTemplate===k?"1px solid rgba(139,233,253,0.2)":"1px solid transparent",borderRadius:4,color:activeTemplate===k?"#8be9fd":"#f8f8f2",fontSize:"0.72rem",cursor:"pointer",fontFamily:"inherit",textAlign:"left",marginBottom:3}}>
                <span>{icon}</span>{label}
              </button>
            ))}
          </div>
          <div style={{padding:"8px 12px",borderTop:"1px solid #44475a",fontSize:"0.58rem",color:"#6272a4",textAlign:"center"}}>Ctrl+Enter to compile</div>
        </div>

        {/* EDITOR COLUMN */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

          {/* Tab bar */}
          <div style={{display:"flex",alignItems:"center",background:"#21222c",borderBottom:"1px solid #44475a",height:36,flexShrink:0}}>
            <div style={{padding:"0 16px",height:"100%",display:"flex",alignItems:"center",gap:6,background:"#282a36",borderRight:"1px solid #44475a",borderTop:"2px solid #8be9fd",fontSize:"0.75rem"}}>
              <span style={{color:"#8be9fd"}}>📄</span> Contract.sol
            </div>
          </div>

          {/* Editor */}
          <div style={{flex:1,display:"flex",overflow:"hidden",position:"relative"}}>

            {/* Line numbers */}
            <div ref={lnRef} style={{width:46,background:"#282a36",borderRight:"1px solid #383a4a",paddingTop:14,fontFamily:"inherit",fontSize:13,lineHeight:"22px",textAlign:"right",overflow:"hidden",userSelect:"none",flexShrink:0}}>
              {lines.map((_,i)=>(
                <div key={i} style={{paddingRight:8,paddingLeft:4,color:i+1===cursor.ln?"#f8f8f2":"#44475a",background:i+1===cursor.ln?"rgba(139,233,253,0.05)":"transparent"}}>
                  {i+1}
                </div>
              ))}
            </div>

            {/* Highlight + textarea wrapper */}
            <div style={{flex:1,position:"relative",overflow:"hidden"}}>
              {/* Highlighted layer */}
              <div ref={hlRef} style={{position:"absolute",top:0,left:0,right:0,bottom:0,padding:"14px 14px",fontFamily:"inherit",fontSize:13,lineHeight:"22px",whiteSpace:"pre",overflow:"hidden",pointerEvents:"none",zIndex:1}}>
                {lines.map((line,i)=>(
                  <div key={i} style={{minHeight:"22px",background:i+1===cursor.ln?"rgba(68,71,90,0.25)":"transparent"}}>
                    <HighlightLine line={line}/>
                  </div>
                ))}
              </div>

              {/* Transparent textarea */}
              <textarea
                ref={taRef}
                value={code}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
                onClick={updateCursor}
                onKeyUp={updateCursor}
                spellCheck={false}
                style={{position:"absolute",top:0,left:0,right:0,bottom:0,padding:"14px 14px",fontFamily:"inherit",fontSize:13,lineHeight:"22px",background:"transparent",color:"transparent",caretColor:"#f8f8f2",border:"none",outline:"none",resize:"none",overflow:"auto",whiteSpace:"pre",tabSize:4,zIndex:2}}
              />

              {/* Autocomplete */}
              {showSugg && suggestions.length>0 && (
                <div style={{position:"absolute",top:suggPos.top,left:suggPos.left,background:"#21222c",border:"1px solid #6272a4",borderRadius:6,zIndex:100,minWidth:210,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",overflow:"hidden"}}>
                  {suggestions.map((s,i)=>(
                    <div key={s} onMouseDown={e=>{e.preventDefault();applyAC(s);}} style={{padding:"5px 12px",cursor:"pointer",fontSize:"0.78rem",background:i===suggIdx?"rgba(139,233,253,0.12)":"transparent",color:i===suggIdx?"#8be9fd":"#f8f8f2",borderLeft:i===suggIdx?"2px solid #8be9fd":"2px solid transparent"}}>
                      {s}
                    </div>
                  ))}
                  <div style={{padding:"3px 12px",fontSize:"0.58rem",color:"#6272a4",borderTop:"1px solid #44475a"}}>↑↓ navigate · Enter accept · Esc close</div>
                </div>
              )}
            </div>
          </div>

          {/* OUTPUT PANEL */}
          <div style={{height:250,borderTop:"1px solid #44475a",display:"flex",flexDirection:"column",flexShrink:0}}>
            <div style={{display:"flex",background:"#21222c",borderBottom:"1px solid #44475a",flexShrink:0}}>
              {[["console","🖥️ Console"],["abi","📜 ABI"],["info","ℹ️ Info"]].map(([t,label])=>(
                <div key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",fontSize:"0.7rem",cursor:"pointer",color:tab===t?"#8be9fd":"#6272a4",borderBottom:tab===t?"2px solid #8be9fd":"2px solid transparent",background:tab===t?"rgba(139,233,253,0.04)":"transparent",userSelect:"none"}}>
                  {label}
                </div>
              ))}
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"10px 14px",fontSize:"0.75rem",lineHeight:"1.7"}}>

              {/* CONSOLE TAB */}
              {tab==="console" && (
                logs.length===0
                  ? <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"#6272a4",gap:6}}>
                      <div style={{fontSize:"1.6rem"}}>⬡</div>
                      <div>Click <strong style={{color:"#8be9fd"}}>Compile & Analyze</strong> or press Ctrl+Enter</div>
                    </div>
                  : logs.map(log=>(
                    <div key={log.id} style={{display:"flex",gap:10,marginBottom:2,alignItems:"flex-start"}}>
                      <span style={{color:"#44475a",fontSize:"0.62rem",flexShrink:0,marginTop:3,minWidth:56}}>{log.time}</span>
                      <span style={{flexShrink:0,minWidth:18}}>{log.icon}</span>
                      <span style={{color:LOG_COLORS[log.type]||"#f8f8f2",flex:1,wordBreak:"break-word"}}>{log.text}</span>
                    </div>
                  ))
              )}

              {/* ABI TAB */}
              {tab==="abi" && (
                !result
                  ? <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"#6272a4",gap:6}}><div style={{fontSize:"1.6rem"}}>📜</div><div>Compile first to see ABI</div></div>
                  : <div style={{background:"#21222c",border:"1px solid #44475a",borderRadius:6,padding:10}}>
                      <div style={{fontSize:"0.6rem",letterSpacing:2,color:"#8be9fd",textTransform:"uppercase",marginBottom:8}}>Contract: {result.contractName}</div>
                      {result.hasConstructor&&<div style={{display:"flex",gap:8,alignItems:"center",padding:"4px 0",borderBottom:"1px solid #383a4a",flexWrap:"wrap"}}>
                        <span style={{padding:"1px 6px",borderRadius:3,fontSize:"0.6rem",fontWeight:700,background:"rgba(80,250,123,0.15)",color:"#50fa7b"}}>constructor</span>
                        <span>constructor({result.constructorParams||""})</span>
                      </div>}
                      {(result.functions||[]).map((fn,i)=>(
                        <div key={i} style={{display:"flex",gap:8,alignItems:"center",padding:"4px 0",borderBottom:"1px solid #383a4a",flexWrap:"wrap"}}>
                          <span style={{padding:"1px 6px",borderRadius:3,fontSize:"0.6rem",fontWeight:700,background:"rgba(189,147,249,0.2)",color:"#bd93f9"}}>{fn.visibility}</span>
                          <span style={{color:"#50fa7b"}}>{fn.name}</span>
                          <span style={{color:"#6272a4"}}>({fn.params})</span>
                          {fn.mutability&&<span style={{color:"#ffb86c",fontSize:"0.65rem"}}>{fn.mutability}</span>}
                          <span style={{color:"#44475a",marginLeft:"auto",fontSize:"0.65rem"}}>→ {fn.returns||"void"}</span>
                          {result.gasEstimates?.functions?.[fn.name]&&<span style={{color:"#44475a",fontSize:"0.6rem"}}>⛽{result.gasEstimates.functions[fn.name]}</span>}
                        </div>
                      ))}
                      {(result.events||[]).map((ev,i)=>(
                        <div key={`ev${i}`} style={{display:"flex",gap:8,alignItems:"center",padding:"4px 0",borderBottom:"1px solid #383a4a"}}>
                          <span style={{padding:"1px 6px",borderRadius:3,fontSize:"0.6rem",fontWeight:700,background:"rgba(139,233,253,0.12)",color:"#8be9fd"}}>event</span>
                          <span>{ev.name}({ev.params})</span>
                        </div>
                      ))}
                      {(result.stateVars||[]).map((sv,i)=>(
                        <div key={`sv${i}`} style={{display:"flex",gap:8,alignItems:"center",padding:"4px 0",borderBottom:"1px solid #383a4a"}}>
                          <span style={{padding:"1px 6px",borderRadius:3,fontSize:"0.6rem",fontWeight:700,background:"rgba(241,250,140,0.1)",color:"#f1fa8c"}}>state</span>
                          <span style={{color:"#8be9fd"}}>{sv.type}</span><span>{sv.name}</span>
                          <span style={{color:"#44475a",marginLeft:"auto",fontSize:"0.65rem"}}>{sv.visibility}</span>
                        </div>
                      ))}
                    </div>
              )}

              {/* INFO TAB */}
              {tab==="info" && (
                !result
                  ? <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",color:"#6272a4",gap:6}}><div style={{fontSize:"1.6rem"}}>ℹ️</div><div>Compile first to see info</div></div>
                  : <>
                      <div style={{background:"#21222c",border:"1px solid #44475a",borderRadius:6,padding:10,marginBottom:8}}>
                        <div style={{fontSize:"0.6rem",letterSpacing:2,color:"#8be9fd",textTransform:"uppercase",marginBottom:8}}>Analysis Report</div>
                        {[
                          ["Contract",result.contractName],["Pragma",result.pragma],["License",result.license||"None"],
                          ["Functions",(result.functions||[]).length],["Events",(result.events||[]).length],
                          ["State Vars",(result.stateVars||[]).length],["Modifiers",(result.modifiers||[]).join(", ")||"None"],
                          ["Constructor",result.hasConstructor?"Yes":"No"],["Deploy Gas",result.gasEstimates?.deployment||"N/A"],
                          ["Security",(result.securityIssues||[]).length===0?"✅ Clean":`⚠️ ${result.securityIssues.length} issue(s)`],
                        ].map(([k,v])=>(
                          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #383a4a",fontSize:"0.73rem"}}>
                            <span style={{color:"#6272a4"}}>{k}</span><span style={{color:"#8be9fd"}}>{v}</span>
                          </div>
                        ))}
                      </div>
                      {result.summary&&<div style={{background:"#21222c",border:"1px solid #44475a",borderRadius:6,padding:10}}>
                        <div style={{fontSize:"0.6rem",letterSpacing:2,color:"#8be9fd",textTransform:"uppercase",marginBottom:6}}>AI Summary</div>
                        <div style={{color:"#f8f8f2",fontSize:"0.73rem",lineHeight:1.7}}>{result.summary}</div>
                      </div>}
                    </>
              )}
            </div>
          </div>

          {/* STATUS BAR */}
          <div style={{display:"flex",gap:16,alignItems:"center",padding:"2px 14px",background:"#21222c",borderTop:"1px solid #44475a",fontFamily:"inherit",fontSize:"0.6rem",color:"#6272a4",flexShrink:0}}>
            <span>
              <span style={{width:6,height:6,borderRadius:"50%",background:status.dot,display:"inline-block",marginRight:5,animation:compiling?"pulse 1s infinite":"none"}}/>
              {status.text}
            </span>
            <span>Ln {cursor.ln}, Col {cursor.col}</span>
            <span>{lines.length} lines</span>
            <span>Solidity</span>
            <span>UTF-8</span>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
          </div>
        </div>
      </div>
    </div>
  );
}
