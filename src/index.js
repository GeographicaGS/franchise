import React from 'react'
import ReactDOM from 'react-dom'
import * as State from './state'
import App from './app'
import _ from 'lodash'
import './state/import.js'

window.addEventListener("message", function(e){
    sessionStorage.importData = e.data;
    try {
        window.top.location.replace(location.reload())
    } catch (err) {
        window.top.location = location.reload()
    }
}, false);

window.STATE = State;

const ManagedApp = State.Application(state => <App state={state} />)
ReactDOM.render(<ManagedApp />, document.querySelector('#app'))

if (module.hot) module.hot.accept();