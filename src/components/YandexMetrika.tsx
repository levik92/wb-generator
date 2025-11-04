import { useEffect } from 'react';

const YandexMetrika = () => {
  useEffect(() => {
    // Проверяем, не был ли скрипт уже добавлен
    if (document.getElementById('yandex-metrika-script')) {
      return;
    }

    // Создаем и добавляем основной скрипт
    const script = document.createElement('script');
    script.id = 'yandex-metrika-script';
    script.type = 'text/javascript';
    script.innerHTML = `
      (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
      })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=105111303', 'ym');

      ym(105111303, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});
    `;
    document.head.appendChild(script);

    // Создаем и добавляем noscript часть
    const noscript = document.createElement('noscript');
    noscript.innerHTML = '<div><img src="https://mc.yandex.ru/watch/105111303" style="position:absolute; left:-9999px;" alt="" /></div>';
    document.body.appendChild(noscript);

    // Cleanup при размонтировании
    return () => {
      const scriptElement = document.getElementById('yandex-metrika-script');
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, []);

  return null;
};

export default YandexMetrika;
