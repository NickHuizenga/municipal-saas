import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const Page: React.FC = () => {
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center',color:'#e5e5e5',background:'#0a0a0a',padding:'24px'}}>
      <div style={{width:'100%',maxWidth:480,border:'1px solid #262626',borderRadius:16,background:'#111111',padding:'24px'}}>
        <h1 style={{fontSize:20,marginBottom:12}}>Sign in</h1>
        <p style={{fontSize:14,color:'#a3a3a3',marginBottom:16}}>We’ll email you a magic link.</p>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          view="magic_link"
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/tenant/select`}
          showLinks={false}
        />
      </div>
    </div>
  );
};

export default Page;
