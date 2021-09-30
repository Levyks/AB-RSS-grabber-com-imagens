const axios = require('axios');
const fxp = require('fast-xml-parser');
const express = require('express');
const metascraper = require('metascraper')([
  require('metascraper-image')()
]);

const ObjToXmlParser = new fxp.j2xParser({ignoreAttributes : false, format: true});

const app = express();

app.get('/agencia-brasil.xml', (req, res) => {

  res.set('Content-Type', 'text/xml');

  axios.get("http://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml").then(responseXml => {
  
    let itensProcessados = 0;

    const xml = fxp.parse(responseXml.data, {ignoreAttributes : false});
    
    xml.rss.channel.item.forEach(async (item, idx) => {
      
      const { data: html } = await axios.get(item.link);

      const metadata = await metascraper({html, url: item.link});

      item.image = { url: metadata.image }

      item.description = formatarHtml(item.description);

      xml.rss.channel.item[idx] = item;

      if(++itensProcessados === xml.rss.channel.item.length) {
        res.send(ObjToXmlParser.parse(xml));
      }

    });

  });

});

function formatarHtml(html) {
  return html
    //Remove <imgs> com o lazyload personalizado da agência
    .replace(/&lt;img src=&quot;\/sites\/default\/files\/thumbnails\/image\/loading_v2\.gif&quot;.*?&gt;/g, '')
    //Remove os <noscript> ao redor da <img> "tradicional" sem lazyload
    .replace(/&lt;noscript&gt;(&lt;img.*?&lt;)\/noscript&gt;/g, "$1");
}

app.listen(3000);

