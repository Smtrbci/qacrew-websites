/* QAcrew Forge — site etkileşimleri (önce/sonra önizleme, fiyat dönemi, mobil menü) */
(function(){
  var check='<span class="box"><svg width="12" height="12" viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  var modes={
    test:{
      file:'odeme-akisi_user-story.txt → test-cases.csv',
      before:'US-482\nkullanıcı kayıtlı kartıyla ödeme yapabilmeli. kart yoksa yeni kart ekleyebilsin. <mark>3d secure</mark> olmalı galiba. hatalı kartta uyarı çıksın. <mark>limit yetersizse?</mark> sepet tutarı 0 ise buton pasif olsun…',
      after:'<table class="tbl"><thead><tr><th>ID</th><th>Senaryo</th><th class="hide-sm">Beklenen sonuç</th><th>Öncelik</th></tr></thead><tbody>'+
        '<tr><td>TC-001</td><td>Kayıtlı kartla başarılı ödeme</td><td class="hide-sm">Sipariş onay ekranı açılır</td><td><span class="pill p-high">Yüksek</span></td></tr>'+
        '<tr><td>TC-002</td><td>3D Secure doğrulaması iptal edilir</td><td class="hide-sm">Ödeme tamamlanmaz, sepet korunur</td><td><span class="pill p-high">Yüksek</span></td></tr>'+
        '<tr><td>TC-003</td><td>Limiti yetersiz kartla ödeme</td><td class="hide-sm">"Limit yetersiz" uyarısı gösterilir</td><td><span class="pill p-mid">Orta</span></td></tr>'+
        '<tr><td>TC-004</td><td>Yeni kart ekleyip ödeme</td><td class="hide-sm">Kart kaydedilir, ödeme alınır</td><td><span class="pill p-mid">Orta</span></td></tr>'+
        '<tr><td>TC-005</td><td>Sepet tutarı 0 iken buton</td><td class="hide-sm">"Öde" butonu pasiftir</td><td><span class="pill p-low">Düşük</span></td></tr>'+
        '</tbody></table>'
    },
    bug:{
      file:'slack_#mobil-test.txt → BUG-1093 · bug-report.csv',
      before:'@ali ödeme sayfası yine bozuk <mark>bazen</mark> açılmıyor. android de oldu sanırım, dün akşam. tekrar denedim düzeldi sonra yine oldu. <mark>ekran görüntüsü yok</mark> ama kesin bir şey var',
      after:'<dl class="fields">'+
        '<dt>Başlık</dt><dd>Android: Ödeme ekranı ağ değişiminden sonra boş açılıyor</dd>'+
        '<dt>Öncelik</dt><dd><span class="pill p-high">Kritik</span></dd>'+
        '<dt>Ortam</dt><dd>Android 14 · Pixel 7 · Uygulama v3.8.2 (prod)</dd>'+
        '<dt>Adımlar</dt><dd><ol><li>Sepete ürün ekle</li><li>Wi-Fi\'dan mobil veriye geç</li><li>"Ödemeye geç"e dokun</li></ol></dd>'+
        '<dt>Beklenen</dt><dd>Kayıtlı kartlar listelenir</dd>'+
        '<dt>Gerçekleşen</dt><dd>Ekran boş kalır, geri tuşu çalışmaz</dd>'+
        '</dl>'
    },
    smoke:{
      file:'surum-notlari_v3.9.md → smoke-checklist.csv',
      before:'v3.9 sürüm notları\n- giriş ekranı yenilendi\n- biyometrik giriş eklendi\n- bildirim izinleri değişti\n- <mark>ödeme sdk güncellendi</mark>\n- küçük düzeltmeler',
      after:'<ul class="checks">'+
        '<li class="done">'+check+'Uygulama açılıyor, çökme yok<span class="meta">iOS · Android</span></li>'+
        '<li class="done">'+check+'E-posta ve şifre ile giriş<span class="meta">Yeni ekran</span></li>'+
        '<li class="done">'+check+'Face ID / parmak izi ile giriş<span class="meta">Yeni</span></li>'+
        '<li>'+'<span class="box"></span>'+'Bildirim izni istemi doğru anda<span class="meta">Değişti</span></li>'+
        '<li>'+'<span class="box"></span>'+'Kayıtlı kartla test ödemesi<span class="meta">SDK güncel</span></li>'+
        '</ul>'
    },
    reg:{
      file:'degisen-moduller.txt → regression-set.csv',
      before:'bu sprint değişenler:\nsepet servisi, kampanya motoru, adres formu (yeni il/ilçe listesi)\n<mark>kampanya + kupon birlikte?</mark>\nprofil sayfasına dokunmadık',
      after:'<table class="tbl"><thead><tr><th>Suite</th><th>Kapsam</th><th class="hide-sm">Test</th><th>Öncelik</th></tr></thead><tbody>'+
        '<tr><td>RG-01</td><td>Sepet: ekleme, silme, adet</td><td class="hide-sm">14</td><td><span class="pill p-high">Yüksek</span></td></tr>'+
        '<tr><td>RG-02</td><td>Kampanya ve kupon birlikte</td><td class="hide-sm">9</td><td><span class="pill p-high">Yüksek</span></td></tr>'+
        '<tr><td>RG-03</td><td>Adres formu il/ilçe seçimi</td><td class="hide-sm">7</td><td><span class="pill p-mid">Orta</span></td></tr>'+
        '<tr><td>RG-04</td><td>Ödeme uçtan uca</td><td class="hide-sm">6</td><td><span class="pill p-mid">Orta</span></td></tr>'+
        '<tr><td>RG-05</td><td>Profil (değişmedi, örneklem)</td><td class="hide-sm">3</td><td><span class="pill p-low">Düşük</span></td></tr>'+
        '</tbody></table>'
    }
  };
  var before=document.getElementById('paneBefore'), after=document.getElementById('paneAfter'), file=document.getElementById('demoFile');
  function render(m){
    var d=modes[m];
    before.innerHTML='<span class="pane-label">Önce · ham girdi</span><div class="raw">'+d.before+'</div>';
    after.innerHTML='<span class="pane-label">Sonra · QAcrew</span><div class="out">'+d.after+'</div>';
    file.textContent=d.file;
  }
  render('test');
  document.querySelectorAll('.chip').forEach(function(c){
    c.addEventListener('click',function(){
      document.querySelectorAll('.chip').forEach(function(x){x.setAttribute('aria-pressed',x===c?'true':'false')});
      render(c.dataset.mode);
    });
  });
  var ba=document.getElementById('ba'), range=document.getElementById('baRange');
  function setPos(){ba.style.setProperty('--pos',range.value+'%')}
  range.addEventListener('input',setPos); setPos();

  document.querySelectorAll('.billing button').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('.billing button').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
      var k=b.dataset.bill;
      document.querySelectorAll('.price b[data-m]').forEach(function(p){p.textContent=p.dataset[k]});
    });
  });

  var mb=document.getElementById('menuBtn'), mn=document.getElementById('mobileNav');
  mb.addEventListener('click',function(){
    var open=mn.hidden; mn.hidden=!open;
    mb.setAttribute('aria-expanded',String(open));
    mb.setAttribute('aria-label',open?'Menüyü kapat':'Menüyü aç');
  });
  mn.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){mn.hidden=true;mb.setAttribute('aria-expanded','false')})});
})();
