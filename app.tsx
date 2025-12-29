import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { uploadImage } from './uploadImage';

const POST_LIMIT = 1000;
const ARCHIVE_DAYS = 2;
const POST_INTERVAL = 5000; // 5秒連投制限

export default function App() {
  const [threads, setThreads] = useState<any[]>([]);
  const [thread, setThread] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadImage, setNewThreadImage] = useState<File|null>(null);
  const [newThreadChat, setNewThreadChat] = useState(false);
  const [text, setText] = useState('');
  const [mail, setMail] = useState('');
  const [file, setFile] = useState<File|null>(null);
  const [chatText, setChatText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [conn, setConn] = useState({count:0, max:0});
  const [lastPostTime, setLastPostTime] = useState<number>(0);
  const [showTerms, setShowTerms] = useState(false);

  const ninja = localStorage.getItem('ninja') || 'ザ・匿名';
  const userId = localStorage.getItem('uid') || Math.random().toString(36).slice(2,10);
  useEffect(()=>localStorage.setItem('uid', userId),[]);

  // スレ一覧取得
  useEffect(()=>{
    supabase.from('threads').select('*').order('updated_at',{ascending:false})
      .then(r=>setThreads(r.data||[]));
  },[]);

  // 接続数リアルタイム
  useEffect(()=>{
    if(!thread) return;
    supabase.channel('connections')
      .on('postgres_changes',{event:'*',schema:'public',table:'connections'},
        payload=>{
          if(payload.new.thread_id===thread.id)
            setConn({count:payload.new.count,max:payload.new.max_count});
        }
      ).subscribe();
  },[thread]);

  const openThread = async (t:any)=>{
    setThread(t);
    setShowChat(false);
    const p = await supabase.from('posts').select('*').eq('thread_id',t.id).eq('is_archived',false).order('created_at');
    setPosts(p.data||[]);
    const c = await supabase.from('chats').select('*').eq('thread_id',t.id).order('created_at');
    setChats(c.data||[]);

    // 接続数増加
    const { data } = await supabase.from('connections').select('*').eq('thread_id',t.id).single();
    if(data){
      await supabase.from('connections').update({count:data.count+1,max_count:Math.max(data.count+1,data.max_count)}).eq('thread_id',t.id);
    } else {
      await supabase.from('connections').insert({thread_id:t.id,count:1,max_count:1});
    }
  };

  const checkArchive = async (threadId:number)=>{
    const now=new Date();
    const { data: allPosts } = await supabase.from('posts').select('id,created_at').eq('thread_id',threadId).eq('is_archived',false).order('created_at');
    if(!allPosts) return;

    // 最新1000件以外
    if(allPosts.length>POST_LIMIT){
      const over = allPosts.length-POST_LIMIT;
      const archiveIds = allPosts.slice(0,over).map(p=>p.id);
      await supabase.from('posts').update({is_archived:true}).in('id',archiveIds);
    }

    // 2日以上経過
    const expiredIds = allPosts.filter(p=>new Date(p.created_at)<new Date(now.getTime()-ARCHIVE_DAYS*24*60*60*1000)).map(p=>p.id);
    if(expiredIds.length>0) await supabase.from('posts').update({is_archived:true}).in('id',expiredIds);
  };

  const canPost = ()=>{
    const now=Date.now();
    if(now-lastPostTime<POST_INTERVAL){ alert(`連投制限: ${POST_INTERVAL/1000}秒あけてください`); return false; }
    setLastPostTime(now); return true;
  };

  const post = async ()=>{
    if(!thread || !canPost()) return;
    let img = null; if(file) img=await uploadImage(file);
    const sage = mail==='sage';
    await supabase.from('posts').insert({
      thread_id:thread.id,content:text,ninja_name:ninja,mail,sage,image_url:img,user_id:userId
    });
    await checkArchive(thread.id);
    setText(''); setMail(''); setFile(null);
    openThread(thread);
  };

  const chatPost = async ()=>{
    if(!thread || !canPost()) return;
    let img=null; if(file) img=await uploadImage(file);
    await supabase.from('chats').insert({thread_id:thread.id,content:chatText,image_url:img});
    setChatText(''); setFile(null); openThread(thread);
  };

  const createThread = async ()=>{
    let img=null; if(newThreadImage) img=await uploadImage(newThreadImage);
    await supabase.from('threads').insert({title:newThreadTitle,ninja_name:ninja,image_url:img,enable_chat:newThreadChat});
    setNewThreadTitle(''); setNewThreadImage(null); setNewThreadChat(false);
    const { data } = await supabase.from('threads').select('*').order('updated_at',{ascending:false});
    setThreads(data||[]);
  };

  const fetchArchivedPosts = async ()=> {
    if(!thread) return [];
    const { data } = await supabase.from('posts').select('*').eq('thread_id',thread.id).eq('is_archived',true).order('created_at');
    return data||[];
  };

  return (
    <div style={{fontFamily:"'MS Gothic','Meiryo','monospace'",backgroundColor:'#f7f5e6',color:'#000',padding:10}}>

      {/* ヘッダー */}
      <h1 style={{textAlign:'center', marginBottom:10}}>ザ・匿名</h1>

      {/* 利用規約ボタン */}
      <button onClick={()=>setShowTerms(!showTerms)} style={{marginBottom:10}}>
        {showTerms ? '利用規約を閉じる' : '利用規約を表示'}
      </button>

      {/* 利用規約 */}
      {showTerms && (
        <div style={{background:'#fff',border:'1px solid #ccc',padding:10,marginBottom:10,maxHeight:'400px',overflowY:'auto'}}>
          <h2>ザ・匿名 利用規約</h2>

          <h3>1. 総則</h3>
          <p>
            当掲示板（以下「ザ・匿名」）は、ザ・匿名として自由に意見や情報を投稿できるサービスです。<br />
            本規約は、すべての利用者に適用されます。利用者は本規約に同意した上で利用してください。
          </p>

          <h3>2. 投稿に関するルール</h3>
          <ul>
            <li>投稿は日本語または英語でお願いします。</li>
            <li>公序良俗に反する内容、他者の権利を侵害する内容、違法行為を助長する内容の投稿は禁止です。</li>
            <li>他人を誹謗中傷する書き込みは禁止です。</li>
            <li>個人情報（氏名・住所・電話番号・メールアドレスなど）の公開は禁止です。</li>
            <li>同一内容の連投・スパム行為は禁止です（連投制限あり）。</li>
          </ul>

          <h3>3. 画像・ファイル投稿</h3>
          <ul>
            <li>投稿できる画像・ファイルは、著作権や肖像権を侵害しないものに限ります。</li>
            <li>不適切な画像は削除される場合があります。</li>
          </ul>

          <h3>4. 過去ログ・保存</h3>
          <ul>
            <li>投稿は自動的に過去ログに移動されることがあります（最新1000レス保持、または2日経過後）。</li>
            <li>過去ログは閲覧可能ですが、編集や削除はできません。</li>
          </ul>

          <h3>5. 匿名機能</h3>
          <ul>
            <li>投稿者の名前は自由に設定できますが、初期表示は <b>ザ・匿名</b> となります。</li>
            <li>投稿者IDやIPアドレスは、荒らし防止・管理目的で保存される場合があります。</li>
          </ul>

          <h3>6. サービスの提供と責任</h3>
          <ul>
            <li>ザ・匿名の利用によって生じたいかなる損害も、運営は責任を負いません。</li>
            <li>サービスは予告なく停止・変更・削除されることがあります。</li>
          </ul>

          <h3>7. 禁止行為</h3>
          <ul>
            <li>スパム・広告の投稿</li>
            <li>他者のなりすまし</li>
            <li>プログラムやスクリプトによる攻撃行為</li>
            <li>ザ・匿名の運営を妨害する行為</li>
          </ul>

          <h3>8. 免責事項</h3>
          <ul>
            <li>ザ・匿名の内容は利用者自身の責任で利用してください。</li>
            <li>運営は投稿内容の正確性・安全性を保証しません。</li>
          </ul>

          <h3>9. 規約の変更</h3>
          <ul>
            <li>本規約は運営の判断により変更される場合があります。</li>
            <li>規約変更後も利用を続ける場合、変更内容に同意したものとみなされます。</li>
          </ul>
        </div>
      )}

      {/* スレ立てフォーム */}
      <div style={{background:'#fff',border:'1px solid #ccc',padding:6,marginBottom:10}}>
        <h3 style={{fontSize:'14px'}}>スレ立て</h3>
        <input placeholder="タイトル" value={newThreadTitle} onChange={e=>setNewThreadTitle(e.target.value)} style={{width:'100%',marginBottom:2,fontSize:'12px'}} />
        <input type="file" onChange={e=>setNewThreadImage(e.target.files?.[0]||null)} style={{marginBottom:2,fontSize:'12px'}} />
        <label style={{fontSize:'12px'}}>
          <input type="checkbox" checked={newThreadChat} onChange={e=>setNewThreadChat(e.target.checked)} /> Chat機能
        </label>
        <button onClick={createThread} style={{marginLeft:4,fontSize:'12px'}}>作成</button>
      </div>

      {/* 板一覧 */}
      {!thread && threads.map(t=>(
        <div key={t.id} onClick={()=>openThread(t)} style={{background:'#fff',border:'1px solid #ccc',padding:'4px 6px',marginBottom:2,cursor:'pointer'}}>
          ■ {t.title} <small>({t.ninja_name})</small>
        </div>
      ))}

      {/* スレッド・レス */}
      {thread && <>
        <div style={{marginBottom:5}}>同時接続: {conn.count}　最大: {conn.max}</div>

        <textarea rows={5} value={text} onChange={e=>setText(e.target.value)} style={{width:'100%',marginBottom:2}} />
        <input placeholder="mail" value={mail} onChange={e=>setMail(e.target.value)} style={{marginBottom:2,fontSize:'12px'}} />
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} style={{marginBottom:2}} />
        <button onClick={post}>レス投稿</button>

        {posts.map((p,i)=>(
          <div key={p.id} id={`res-${i+1}`} style={{borderBottom:'1px dotted #ccc',padding:'2px 4px',fontSize:'12px'}}>
            <span style={{color:'#888'}}>No.{i+1}</span> 
            <span style={{marginLeft:6,color:p.mail==='sage'?'blue':'#000'}}>{p.ninja_name}</span> 
            <span style={{marginLeft:6,color:'#555',fontSize:'10px'}}>ID:{p.user_id}</span>
            <pre style={{whiteSpace:'pre-wrap',margin:'2px 0'}}>{p.content}</pre>
            {p.image_url && <img src={p.image_url} style={{maxWidth:300,display:'block',margin:'4px 0'}} />}
          </div>
        ))}

        {/* 過去ログ */}
        <div style={{marginTop:5}}>
          <a href="#" onClick={async e=>{
            e.preventDefault();
            const archived=await supabase.from('posts').select('*').eq('thread_id',thread.id).eq('is_archived',true).order('created_at').then(r=>r.data||[]);
            alert(`過去ログ:\n${archived.map(a=>a.content).join('\n---\n')}`);
          }}>過去ログを見る</a>
        </div>

        {/* Chat */}
        {thread.enable_chat && <>
          <button onClick={()=>setShowChat(!showChat)}>💬 Chat</button>
          {showChat && <div style={{position:'fixed',right:20,bottom:20,width:300,height:400,background:'#fff',border:'1px solid #000'}}>
            <div style={{overflow:'auto',height:350}}>
              {chats.map((c,i)=>(
                <div key={c.id}>
                  {i+1}:{c.content}
                  {c.image_url && <img src={c.image_url} width={200} />}
                </div>
              ))}
            </div>
            <input value={chatText} onChange={e=>setChatText(e.target.value)} />
            <button onClick={chatPost}>送信</button>
          </div>}
        </>}
      </>}
    </div>
  );
}
