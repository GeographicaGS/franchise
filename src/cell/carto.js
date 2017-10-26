import React from 'react'

import { addCell } from '../notebook'

import './carto.less'

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

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
            layer: undefined,
            mapConfig: {
              maxZoom: 18,
              minZoom: 0,
              center: [0, 0],
              zoom: 0
            },
            fitBoundsMaxZoom: 12,
            tooltip: ['<script type="infowindow/html" id="infowindow_template">',
                        '<div class="cartodb-popup">',
                            '<a href="#close" class="cartodb-popup-close-button close">x</a>',
                            '<div class="cartodb-popup-content-wrapper">',
                                '<div class="cartodb-popup-content">',
                                    '{{cartodb_id}}',
                                '</div>',
                            '</div>',
                            '<div class="cartodb-popup-tip-container"></div>',
                        '</div>',
                    '</script>'].join('\n'),
            defaultCSS: ['#layer[\'mapnik::geometry_type\'=1] {',
                        '    marker-width: 7;',
                        '    marker-fill: #EE4D5A;',
                        '    marker-fill-opacity: 0.9;',
                        '    marker-line-color: #FFFFFF;',
                        '    marker-line-width: 1;',
                        '    marker-line-opacity: 1;',
                        '    marker-type: ellipse;',
                        '    marker-allow-overlap: true;',
                        '}',
                        '#layer[\'mapnik::geometry_type\'=2] {',
                        '    line-color: #4CC8A3;',
                        '    line-width: 1.5;',
                        '    line-opacity: 1;',
                        '}',
                        '#layer[\'mapnik::geometry_type\'=3] {',
                        '    polygon-fill: #826DBA;',
                        '    polygon-opacity: 0.9;',
                        '    ::outline {',
                        '        line-color: #FFFFFF;',
                        '        line-width: 1;',
                        '        line-opacity: 0.5;',
                        '    }',
                        '}'].join('\n')
          }

  shouldComponentUpdate(nextProps){
    return nextProps.result.expandedQuery !== this.props.result.expandedQuery
        || nextProps.view.query !== this.props.view.query
  }

  componentWillUpdate(props, state){
    let newQuery = props.result.expandedQuery || props.view.query;
    if (state.layer && state.layer.getQuery() != newQuery) {
      state.layer.getSubLayer(0).setSQL(newQuery);
      this.zoomToLayer(state.layer, this.props.config);
    }
  }

  componentDidMount(){
    let { result, view, config } = this.props;
    var self = this;
    var query = result.expandedQuery || view.query

    if (!this.state.css) {
      this.setState({'css': this.state.defaultCSS});
    }

    this.loadLibrary().then(() => {
        if (cartodb) {
          var map = new cartodb.L.Map('mapContainer_' + view.id, self.state.mapConfig);

          var baseLayer = cartodb.L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png", {
            subdomains: 'abcd',
            maxZoom: self.state.mapConfig.maxZoom,
            minZoom: self.state.mapConfig.minZoom,
            label: 'Voyager'
          }).addTo(map);

          var layer = cartodb.createLayer(map, {
            user_name: config.credentials.user,
            type: 'cartodb',
            sublayers: [{
              sql: query,
              cartocss: self.state.defaultCSS

            }],
            infowindow: true,
            tooltip: true,
            legends: true,
            extra_params: {
             map_key: config.credentials.apiKey
            }
          }, {https: true});

          layer
            .addTo(map)
            .done(function(layer) {
              self.addInfoWindow(map, layer.getSubLayer(0), view.result.columns);
              self.setState({'layer': layer});
              self.cssCell.updateLayer(layer);
              self.zoomToLayer(layer, config);
            });
          addCell();
      }
    }).catch(e => {
      console.log(e);
    });
  }

  addInfoWindow(map, layer, columns){
    cartodb.vis.Vis.addInfowindow(map, layer, this.filterColumns(columns));
  }

  filterColumns(columns){
    return columns.filter(column => column.indexOf('the_geom') == -1);
  }

  zoomToLayer(layer, config){
    var self = this;
    let sql = new cartodb.SQL({ user: config.credentials.user,
                                api_key: config.credentials.apiKey
                              });
    sql.getBounds(
      layer.getQuery().replaceAll('{{', '').replaceAll('}}', '')
    ).done(function(bounds) {
      layer.leafletMap.fitBounds(bounds, { maxZoom: self.state.fitBoundsMaxZoom });
    });
  }

  loadLibrary(resolve, reject){
    return new Promise((resolve, reject) => {
      addCSS('https://cartodb-libs.global.ssl.fastly.net/cartodb.js/v3/3.15/themes/css/cartodb.css');
      addJS('https://cartodb-libs.global.ssl.fastly.net/cartodb.js/v3/3.15/cartodb.js', resolve, reject);
    });
  }

  render(){
    let { result, view } = this.props;
    let mapContainerId = "mapContainer_" + view.id;
    return (
      <div className="carto-container">
        <div className="map-container" id={mapContainerId} />
        <CartoCSSCell
          css={(!this.state.css) ? this.state.defaultCSS : this.state.css}
          layer={this.state.layer}
          ref={(cssCell) => {this.cssCell = cssCell}}
        />
      </div>
    );
  }
}

// import { Cell } from './index'
import CodeMirror from 'codemirror'
import { Intent, Tooltip } from "@blueprintjs/core";
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/markdown/markdown'
import 'codemirror/keymap/sublime'
import 'codemirror/mode/css/css'
import 'codemirror/theme/monokai.css'
import ReactCodeMirror from '@skidding/react-codemirror'

export class CartoCSSCell extends React.PureComponent {

  state = {
    css: undefined,
    layer: undefined
  }

  componentWillReceiveProps(newProps) {
    this.setState({'layer': newProps.layer});
  }

  updateLayer(layer) {
    this.setState({'layer': layer});
  }

  render() {
    const css_options = {
      theme: 'monokai',
      lineNumbers: true,
      lineWrapping: true,
      mode: "text/x-scss",
      // highlightSelectionMatches: {
      //     trim: true
      // },
      extraKeys: {
          'Cmd-Enter': (cm) => this.updateCartoCSS(),
          'Ctrl-Enter': (cm) => this.updateCartoCSS(),
          "Ctrl-Space": "autocomplete"
      },
      // styleActiveLine: true,
      autoCloseBrackets: true,
      matchBrackets: true,
      // addModeClass: true,
      // keyMap: "sublime",
      placeholder: 'Type CartoCSS here...',
      showPredictions: false
    }

    return <div className='carto-css'>
              <div className='input-wrap'>
                <ReactCodeMirror
                    value={(!this.props.css) ? '' : this.props.css}
                    key='a'
                    ref={e => this.cmr = e}
                    onChange={css => { this.setState({'css': css})}}
                    options={ css_options }
                />
              </div>
          </div>
  }

  updateCartoCSS() {
    let layer = this.state.layer || this.props.layer;
    if (layer && this.state.css) {
      layer.setCartoCSS(this.state.css);
    }
  }

}