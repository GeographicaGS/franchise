import React from 'react'
import classNames from 'classnames'

import { updateCell } from './index'

import './cartovl.less'

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function addCSS(url) {
    var link = document.createElement('link')
    link.type = 'text/css'
    link.rel = 'stylesheet'
    link.href = url
    document.head.appendChild(link)
}

function addJS(url, resolve, reject) {
    var script = document.createElement('script')
    script.src = url
    script.addEventListener('load', function() {
        resolve();
    });
    script.addEventListener('error', function(e) {
        reject(e);
    });
    document.head.appendChild(script)
}

export class CartoVLVisualizer extends React.Component {
    static key = 'cartovl';
    static desc = "CARTO VL View";
    static icon = <svg width="16px" height="16px" viewBox="762 -58 32 32" version="1.1" >
      <g className="imago" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd" transform="translate(762.000000, -58.000000)">
        <circle className="Halo" fill="#ccc" opacity="0.6" cx="16" cy="16" r="16"></circle>
        <circle className="point" fill="#ccc" cx="16" cy="16" r="5.5"></circle>
        <text x="8" y="32">VL</text>
      </g>
    </svg>;

    static test(result) {
        return result.columns.some(k => ['the_geom_webmercator'].includes(k.toLowerCase()))
    }

    state = {
        loaded: false,
        layer: undefined,
        mapConfig: {
            maxZoom: 18,
            minZoom: 0,
            center: [0, 0],
            zoom: 0
        },
        fitBoundsMaxZoom: 12,
        tooltip: ['{{popup_content}}'].join('\n'),
        defaultCSS: `color: opacity(#EE4D5A, 0.9)
width: 7
strokeWidth: 1.5
strokeColor: #FFFFFF`
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.result.expandedQuery !== this.props.result.expandedQuery ||
            nextProps.view.query !== this.props.view.query
    }

    componentWillUpdate(props, state) {
        let newQuery = props.result.expandedQuery || props.view.query;
        if (state.layer && state.layer.getSource()._query.trim() != newQuery) {
            const source = new carto.source.SQL(`
                              ${newQuery}
                            `);
            state.layer.update(source, state.viz);
            this.zoomToLayer(state.map, this.props.config);
        }
    }

    componentDidMount() {
        let { result, view, config } = this.props;
        var self = this;
        var query = result.expandedQuery || view.query

        if (view.style) {
            this.state.style = view.style
        }

        if (!this.state.style) {
            this.setState({ 'style': this.state.defaultCSS });
        }

        this.loadLibrary().then(() => {
            if (mapboxgl) {
                const map = new mapboxgl.Map({
                  container: 'mapContainer_' + view.id,
                  style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
                  center: [0, 0],
                  zoom: 0,
                  dragRotate: false
                });

                carto.setDefaultAuth({
                  user: config.credentials.user,
                  apiKey: config.credentials.apiKey || 'default_public'
                });

                const source = new carto.source.SQL(`
                  ${query}
                `);


                const viz = new carto.Viz(self.createVariables(view.result.columns, self.state.style));

                const layer = new carto.Layer('layer-vl', source, viz);

                this.setState({ 'map': map });
                this.setState({ 'layer': layer });

                layer.on('loaded', () => {
                    self.setState({ 'viz': viz });
                    self.cssCell.updateLayer(layer);
                    self.zoomToLayer(map, config);
                });

                layer.on('error', (error) => {
                    console.log(error);
                    updateCell(view.id, { loading: false })
                });

                const interactivity = new carto.Interactivity(layer);
                interactivity.on('featureHover', (event) => { self.addInfoWindow(event, map, layer, view.result.columns) });

                layer.addTo(map, 'watername_ocean');
                self.cssCell.updateCSS(self.state.style);
            }
        }).catch(e => {
            console.log(e);
        });
    }

    createVariables(columns, css) {

        // this.filterColumns(columns).forEach((c) => {
        //     css = `
        //             @${c}: $${c}
        //             ${css}`
        // })

        return css;
    }

    addInfoWindow(event, map, layer, columns) {

        let content = '';
        for (let feature of event.features) {
            for (let variable in feature.variables) {
                content += `
                  <div class="container">
                    <p>${variable}: ${feature.variables[variable].value}</p>
                  </div>
                `;
            }
        }
        content = this.state.tooltip.replace('{{popup_content}}', content);
        document.getElementById('content').innerHTML = content;
        // cartodb.vis.Vis.addInfowindow(map, layer, this.filterColumns(columns));
    }

    filterColumns(columns) {
        return columns.filter(column => column.indexOf('the_geom') == -1 && column != 'cartodb_id');
    }

    zoomToLayer(map, config) {
        let { result, view, _config } = this.props;
        var query = result.expandedQuery || view.query

        var self = this;
        let sql = new cartodb.SQL({
            user: config.credentials.user,
            api_key: config.credentials.apiKey
        });
        sql.getBounds(
            query
        ).done(function(bounds) {
            let bounds2 = [];
            let minXY = bounds[0];
            let temp = minXY[0];
            minXY[0] = minXY[1];
            minXY[1] = temp;

            let maxXY = bounds[1];
            temp = maxXY[0];
            maxXY[0] = maxXY[1];
            maxXY[1] = temp;

            bounds2.push(minXY);
            bounds2.push(maxXY);

            map.fitBounds(new mapboxgl.LngLatBounds(bounds2[1], bounds2[0]), { maxZoom: self.state.fitBoundsMaxZoom, linear: true });
        });
    }

    loadLibrary(resolve, reject) {
        return new Promise((resolve, reject) => {
            addJS('https://libs.cartocdn.com/mapbox-gl/v0.45.0-carto1/mapbox-gl.js', () => {
                addJS('https://cartodb-libs.global.ssl.fastly.net/cartodb.js/v3/3.15/cartodb.js', () => {
                    addJS('https://libs.cartocdn.com/carto-vl/v0.5.0-beta/carto-vl.js', resolve, reject);
                }, reject);
            }, reject);
        });
    }

    render(){
    let { result, view } = this.props;
    let mapContainerId = "mapContainer_" + view.id;
    return (
      <div className="cartovl-container">
        <div className="map-container" id={mapContainerId}>
          <div id="controls">
            <div id="content">
            </div>
          </div>
          <div className="cartodb-logo"><a href="http://www.carto.com" target="_blank"><img alt="CARTO" title="CARTO"></img></a></div>
          <CartoVLStyleCell
            style={(!this.state.style) ? this.state.defaultCSS : this.state.style}
            layer={this.state.layer}
            ref={(cssCell) => {this.cssCell = cssCell}}
            cellId={view.id}
          />
        </div>

      </div>
    );
  }
}

import CodeMirror from 'codemirror'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/markdown/markdown'
import 'codemirror/keymap/sublime'
import 'codemirror/mode/css/css'
import 'codemirror/theme/monokai.css'
import ReactCodeMirror from '@skidding/react-codemirror'
import { Tooltip as BlueprintTooltip, Position } from "@blueprintjs/core";

function Tooltip(props){
    return <BlueprintTooltip
        position={Position.RIGHT}
        tetherOptions={{constraints: [{ attachment: "together", to: "scrollParent" }]}}
        {...props} />
}

export class CartoVLStyleCell extends React.PureComponent {

    key = 'cartovlstyle';
    desc = 'Cmd+Enter to apply changes';

    state = {
        style: undefined,
        layer: undefined,
        shown: true
    }

    componentWillReceiveProps(newProps) {
        this.setState({ 'layer': newProps.layer });
        this.setState({ 'style': newProps.style });
    }

    updateLayer(layer) {
        this.setState({ 'layer': layer });
    }

    updateCSS(style) {
        this.setState({'style': style});
    }

    toggle(e) {
        this.setState({ 'shown': !this.state.shown });
    }

    shouldComponentUpdate(nextProps) {
        return true;
    }

    render() {
        const css_options = {
            theme: 'monokai',
            lineNumbers: false,
            lineWrapping: true,
            mode: "text/x-scss",
            extraKeys: {
                'Cmd-Enter': (cm) => this.updateCartoCSS(),
                'Ctrl-Enter': (cm) => this.updateCartoCSS(),
                "Ctrl-Space": "autocomplete"
            },
            autoCloseBrackets: true,
            matchBrackets: true,
            placeholder: 'Type CARTO VL style here...',
            showPredictions: false
        }

        let { shown } = this.state;

        return <div className={ classNames({
                  'cartovl-css' : true,
                  'hide': !shown
                }) }  >
              <div className='input-wrap'>
                <button type="button" onClick={e => this.toggle(e)}><i className={shown ? "fa fa-angle-double-down" : "fa fa-angle-double-up"} aria-hidden="true"></i></button>
                <Tooltip key={this.key} content={this.desc}>
                  <ReactCodeMirror
                      value={(!this.state.style) ? '' : this.state.style}
                      key='a'
                      ref={e => this.cmr = e}
                      onChange={style => { this.setState({'style': style})}}
                      options={ css_options }
                  >
                  </ReactCodeMirror>
                </Tooltip>
              </div>
          </div>
    }

    updateCartoCSS() {
        let layer = this.state.layer || this.props.layer;
        if (layer && this.state.style) {
            layer.blendToViz(new carto.Viz(this.state.style));
            updateCell(this.props.cellId, { style: this.state.style })
        }
    }
}