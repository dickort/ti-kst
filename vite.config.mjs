import {defineConfig} from 'vite';

// Serve the same generated files that pass CI and are uploaded to Pages.
export default defineConfig({
  plugins:[{
    name:'hero-qa-viewports',
    configureServer(server){server.middlewares.use((req,res,next)=>{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname!=='/__hero-qa')return next();
      const mobile=url.searchParams.get('view')==='mobile',w=mobile?390:1440,h=mobile?844:900;
      res.setHeader('Content-Type','text/html; charset=utf-8');
      res.end(`<!doctype html><html><head><title>TI hero QA ${w}×${h}</title><style>body{margin:0;background:#272727;color:white;font:14px sans-serif}nav{height:32px}a{color:white;margin:0 12px}iframe{display:block;border:0;width:${w}px;height:${h}px}</style></head><body><nav><a href="/__hero-qa?view=desktop">Desktop 1440×900</a><a href="/__hero-qa?view=mobile">Mobile 390×844</a></nav><iframe title="Hero ${w}×${h}" src="/"></iframe></body></html>`);
    });}
  }],
  server: {host:'0.0.0.0', allowedHosts:['terminal.local']},
  optimizeDeps: {noDiscovery:true}
});
