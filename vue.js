class Vue {
    constructor(options) {
        this.$el = document.querySelector(options.el);
        this.$data = options.data
        this.$options = options;

        /*
           $watchEvent 记录监听的属性的所有观察者, 即收集依赖关系,结构为 {dataKey:[{watcher}..]} 
           { 
                str: [{watcher},{watcher},...],     // 一个data可能关联多处
                num: [{watcher},{watcher},...] 
            }
        */
        this.$watchEvent = {};

        this.proxyData();
        this.observe();
        this.compile(this.$el)


    }

    // 劫持 data 属性，并给整个vue 对象赋值，使得能够在外层直接访问data属性： this.str 
    proxyData() {
        // 关键 defineProperty(), 当然给对象赋属性 this[data]即可，但为了实现data改变外层的data属性跟着变
        for (let key in this.$data) {
            // 注意是最外层的 this ，不是 this.$data
            Object.defineProperty(this, key, {
                // 访问 this 属性，返回的值就会作为属性的值
                get() {
                    console.log('访问属性 :', key)
                    return this.$data[key]
                },
                // 更新 this.$data 属性，注意监听的是this，但修改的是this.$data ，因为如果直接监听this.$data 会出现循环赋值的情况
                set(val) {
                    console.log(key, '更新的值:', val)
                    this.$data[key] = val;
                }

            })
        }
    }

    // 劫持数据变化，触发watcher ， 更新视图
    observe() {
        for (let key in this.$data) {
            let that = this;
            let value = this.$data[key];

            Object.defineProperty(this.$data, key, {
                get() {
                    // 这里用 this 是不行的 会使 Object , 但使用 that 会死循环 相当于一直访问属性调用 getter
                    return value;
                },
                set(val) {
                    value = val;

                    // 如果监听记录内，有当前修改的属性，更新视图
                    if (that.$watchEvent[key]) {
                        // console.log(that.$watchEvent[key])
                        that.$watchEvent[key].forEach((item, index) => {
                            console.log("遍历watcher")
                            item.update()
                        })
                    }
                }

            })
        }
    }



    // 编译解析模板
    compile(node) {
        node.childNodes.forEach((item, index) => {


            // 匹配元素节点
            if (item.nodeType == 1) {


                // 元素节点绑定事 （v-on）
                let regType = /@(.*)/;
                // item.attributes 是 map
                for (let attr of item.attributes) {
                    let funType = attr.name.match(regType);
                    if (funType) {
                        // 从 attr 的属性值中 匹配函数名 , ? 为了匹配没有参数传入直接写函数名的情况
                        let regValue = /(^[0-9a-zA-Z_]{1,})(?:\((.*)\))?/;
                        let funValue = attr.value.match(regValue)[1];
                        console.log(this.$options.methods[funValue])
                        // item.addEventListener(funType[1],(e) =>{

                        // })
                        //修改this 指向
                        item.addEventListener(funType[1], this.$options.methods[funValue].bind(this))

                        // 携带参数的情况  ------ 待编写。。。
                    }
                }


                //  v-model
                if (item.hasAttribute("v-model")) {
                    let vmKey = item.getAttribute('v-model');
                    item.value = this.$data[vmKey]
                    // input 事件
                    item.addEventListener('input', (event) => {
                        this[vmKey] = item.value
                    })
                }

            }


            // 匹配文本节点
            if (item.nodeType == 3) {
                let reg = /\{\{(.*?)\}\}/g;
                let text = item.textContent;    
                // 替换文本节点内容
                item.textContent = text.replace(reg, (match, vmKey) => {
                    vmKey = vmKey.trim();

                    // 添加监听 watch
                    if (this.hasOwnProperty(vmKey)) {
                        let watcher = new Watch(this, vmKey, item, 'textContent')
                        // 在$watchEvent对象上创建一个以key 为键的属性，记录 不同data属性 需要更新节点的数量
                        // 属性内推入观察者,该属性更新就触发所有的观察者.
                        if (this.$watchEvent[vmKey]) {
                             // 同一个模板可能会有多个地方使用同一个响应数据
                            this.$watchEvent[vmKey].push(watcher);
                        } else {
                            this.$watchEvent[vmKey] = [];
                            this.$watchEvent[vmKey].push(watcher);
                        }
                    }

                    console.log(this)
                    return this.$data[vmKey];

                })
            }

            if (item.hasChildNodes()) {
                // console.log(this)
                this.compile(item);
            }
        })



    }

}


// 更新视图层
class Watch {
    constructor(vm, key, node, attr) {
        // Vue 对象
        this.vm = vm;
        // data 的key
        this.key = key;
        // 需要数据更新节点
        this.node = node;
        //  更新节点的属性，例如文本节点'textContent' 属性
        this.attr = attr;
    }

    // 更新视图方法
    update() {
        console.log("更新视图")
        this.node[this.attr] = this.vm[this.key]
    }
}