'use strict'

process.env.VUE_ENV = 'server'
const isProd = process.env.NODE_ENV === 'production'

var path = require('path')
var fs = require('fs')
var express = require('express')
const serialize = require('serialize-javascript')

const createBundleRenderer = require('vue-server-renderer').createBundleRenderer

const app = express()

const html = (() => {
    const template = fs.readFileSync(path.resolve('./index.html', 'utf8'))
    const i = template.indexOf('{{ APP }}')
    const style = isProd ? '<link rel="stylesheet" href="/dist/styles.css">' : ''
    return {
        head: template.slice(0, i).replace('{{ STYLE }}', style),
        tail: template.slice(i + '{{ APP }}'.length)
    }
})()

let rederer
if(isProd){
    const bundlePath = resolve('./dist/server-bundle.js')
    renderer = createRenderer(fs.readFileSync(bundlePath, 'utf8'))
}else {
    require('./build/setup-dev-server')(app, bundle => {
        renderer = createRenderer(bundle)
    })
}

function createRenderer(bundle){
    return createBundleRenderer(bundle)
}

app.use('/dist', express.static(path.resolve('./dist')))

app.get('*', (req, res) => {
    if(!renderer){
        return res.end('waiting form compilation... refresh in a mount.')
    }
    var s = Date.now()
    const context = { url: req.url }
    const renderStream = renderer.renderToStream(context)
    let firstChunk = true

    res.write(html.head)

    renderStream.on('data', chunk => {
        if(firstChunk){
            if(context.initialState){
                res.write(
                    `<script>window.__INITIAL_STATE__=${
                        serialize(context.initialState, {isJSON: true})
                    }</script>`
                )
            }
            firstChunk = false
        }
        res.write(chunk)
    })

    renderStream.on('end', () => {
        res.end(html.tail)
        console.log(`whole request: ${Date.now - s}ms`)
    })

    renderStream.on('err', err => {
        throw err
    })

})



