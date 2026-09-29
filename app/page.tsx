"use client";
import { useEffect, useMemo, useState } from "react";
import { Chess, Move } from "chess.js";

const glyph: Record<string,string> = {
  wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",
  bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟"
};
const values: Record<string,number> = {p:100,n:320,b:330,r:500,q:900,k:20000};
const files = ["a","b","c","d","e","f","g","h"];

function evaluate(game:Chess){
  let score=0;
  for(const row of game.board()) for(const p of row) if(p){
    const v=values[p.type] ?? 0;
    score += p.color==="w" ? v : -v;
  }
  return score;
}
function minimax(game:Chess, depth:number, alpha:number, beta:number, maximizing:boolean):number{
  if(depth===0 || game.isGameOver()) return evaluate(game);
  const moves=game.moves({verbose:true}) as Move[];
  if(maximizing){
    let best=-Infinity;
    for(const m of moves){ game.move(m); best=Math.max(best,minimax(game,depth-1,alpha,beta,false)); game.undo(); alpha=Math.max(alpha,best); if(beta<=alpha) break; }
    return best;
  } else {
    let best=Infinity;
    for(const m of moves){ game.move(m); best=Math.min(best,minimax(game,depth-1,alpha,beta,true)); game.undo(); beta=Math.min(beta,best); if(beta<=alpha) break; }
    return best;
  }
}
function aiMove(game:Chess):Move|null{
  const moves=game.moves({verbose:true}) as Move[];
  if(!moves.length) return null;
  let best=-Infinity, bestMove=moves[0];
  for(const m of moves){
    game.move(m);
    const score=minimax(game,2,-Infinity,Infinity,true);
    game.undo();
    if(score>best){best=score;bestMove=m;}
  }
  return bestMove;
}

export default function Home(){
  const [game,setGame]=useState(()=>new Chess());
  const [selected,setSelected]=useState<string|null>(null);
  const [thinking,setThinking]=useState(false);
  const [,refresh]=useState(0);
  const [humanColor,setHumanColor]=useState<"w"|"b">("w");

  const board=game.board();
  const history=game.history();
  const status=useMemo(()=>{
    if(game.isCheckmate()) return game.turn()==="w" ? "Black wins" : "White wins";
    if(game.isDraw()) return "Draw";
    if(game.isCheck()) return game.turn()==="w" ? "White in check" : "Black in check";
    return game.turn()==="w" ? "White to move" : "Black to move";
  },[game,history]);

  useEffect(()=>{
    if(game.isGameOver() || game.turn()===humanColor || thinking) return;
    setThinking(true);
    const timer=setTimeout(()=>{
      const next=aiMove(game);
      if(next) game.move(next);
      setThinking(false); refresh(v=>v+1);
    },350);
    return()=>clearTimeout(timer);
  },[game,history,humanColor,thinking]);

  function reset(color=humanColor){
    setGame(new Chess()); setSelected(null); setThinking(false); setHumanColor(color); refresh(v=>v+1);
  }
  function clickSquare(square:string){
    if(thinking || game.isGameOver() || game.turn()!==humanColor) return;
    const piece=game.get(square as any);
    if(selected){
      try {
        game.move({from:selected,to:square,promotion:"q"});
        setSelected(null); refresh(v=>v+1); return;
      } catch {}
    }
    if(piece && piece.color===humanColor) setSelected(square); else setSelected(null);
  }
  function undo(){
    if(thinking) return;
    game.undo(); if(game.history().length) game.undo();
    setSelected(null); refresh(v=>v+1);
  }
  const shownRows=humanColor==="w"?board:[...board].reverse();
  const shownFiles=humanColor==="w"?files:[...files].reverse();

  return <main>
    <header><div className="brand">TAMTA <span>CHESS</span></div><div className="status">{thinking?"THINKING":status.toUpperCase()}</div></header>
    <section className="game">
      <div className="clock-row"><div>YOU · {humanColor==="w"?"WHITE":"BLACK"}</div><div>V1 · HUMAN VS AI</div><div>AI · {humanColor==="w"?"BLACK":"WHITE"}</div></div>
      <div className="board">
        {shownRows.map((row,ri)=>row.map((piece,ci)=>{
          const square=shownFiles[ci]+(humanColor==="w"?8-ri:ri+1);
          const dark=((files.indexOf(square[0])+Number(square[1]))%2===0);
          return <button aria-label={square} key={square} className={`square ${dark?"dark":"light"} ${selected===square?"selected":""}`} onClick={()=>clickSquare(square)}>
            {piece && <span className={piece.color==="w"?"white-piece":"black-piece"}>{glyph[piece.color+piece.type]}</span>}
          </button>
        }))}
      </div>
      <div className="controls"><button onClick={()=>reset("w")}>NEW GAME</button><button onClick={()=>reset(humanColor==="w"?"b":"w")}>PLAY AS {humanColor==="w"?"BLACK":"WHITE"}</button><button onClick={undo}>UNDO</button></div>
      <div className="lower">
        <div><div className="label">MOVES</div><div className="moves">{history.length?history.map((m,i)=><span key={i}>{i%2===0?Math.floor(i/2)+1+". ":""}{m}</span>):"No moves yet"}</div></div>
        <div className="note">A quiet board.<br/>A difficult opponent.</div>
      </div>
    </section>
  </main>;
}