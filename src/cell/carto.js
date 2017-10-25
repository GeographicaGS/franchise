import React from 'react'

function addCSS(url){
  var link = document.createElement('link')
  link.type = 'text/css'
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

function addJS(url, resolve, reject){
  var script = document.createElement('script')
  script.src = url
  script.addEventListener('load', function () {
    resolve();
  });
  script.addEventListener('error', function (e) {
    reject(e);
  });
  document.head.appendChild(script)
}

export class CartoVisualizer extends React.Component {
  static key = 'carto';
  static desc = "CARTO View";
  static icon = <svg width="16px" height="16px" viewBox="762 -58 32 32" version="1.1" >
      <g class="imago" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" transform="translate(762.000000, -58.000000)">
        <circle class="Halo" fill="#ccc" opacity="0.4" cx="16" cy="16" r="16"></circle>
        <circle class="point" fill="#ccc" cx="16" cy="16" r="5.5"></circle>
      </g>
    </svg>;

  static test(result){
    return result.columns.some(k => ['the_geom'].includes(k.toLowerCase()))
  }

  state = { loaded: false,
            layer: undefined }

  componentWillUpdate(props, state){
    let newQuery = props.result.expandedQuery || props.view.query;
    if (state.layer && state.layer.getQuery() != newQuery) {
      state.layer.getSubLayer(0).setSQL(newQuery);
    }
  }

  componentDidMount(){
    let { result, view, config } = this.props;
    var self = this;
    var query = result.expandedQuery || view.query

    this.loadLibrary().then(() => {
        if (cartodb) {
          var map = new cartodb.L.Map('mapContainer_' + view.id, {
            center: [0,0],
            zoom: 0
          });

          var baseLayer = cartodb.L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png", {
            subdomains: 'abcd',
            maxZoom: 18,
            minZoom: 0,
            label: 'Voyager'
          }).addTo(map);

          var layer = cartodb.createLayer(map, {
            user_name: config.credentials.user,
            type: 'cartodb',
            sublayers: [{
              sql: query,
              cartocss: '#layer {  marker-width: 7;marker-fill: #EE4D5A;marker-fill-opacity: 0.9;marker-line-color: #FFFFFF;marker-line-width: 1;marker-line-opacity: 1;marker-placement: point;marker-type: ellipse;marker-allow-overlap: true;}'
            }],
            extra_params: {
             map_key: config.credentials.apiKey
            }
          });

          layer.addTo(map) // add the layer to our map which already contains 1 sublayer
          .done(function(layer) {
            self.state.layer = layer;
          });
      }
    }).catch(e => {
      console.log(e);
    });
  }

  loadLibrary(resolve, reject){
    return new Promise((resolve, reject) => {
      addCSS('http://libs.cartocdn.com/cartodb.js/v3/3.15/themes/css/cartodb.css');
      addJS('http://libs.cartocdn.com/cartodb.js/v3/3.15/cartodb.js', resolve, reject);
    });
  }

  render(){
    let { result, view } = this.props;
    let mapContainerId = "mapContainer_" + view.id;
    return (
      <div className="carto-container" style={{width: 100 + '%'}}>
        <div id={mapContainerId} style={{height: 100 + '%'}} />
      </div>
    );
  }
}