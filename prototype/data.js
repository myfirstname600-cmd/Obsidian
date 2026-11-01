/* 知识星图 · 交互原型 v0.1
 * 假数据：4 个一级分类、9 个二级主题、24 个知识点。
 * 仅用于确认交互与视觉，不代表最终数据结构。
 */
window.PROTOTYPE_DATA = {
  categories: [
    { id: 'foundations', name: '计算机基础', parentId: null, color: '#22d3ee', order: 1 },

    { id: 'languages', name: '编程语言', parentId: null, color: '#f59e0b', order: 2 },

    { id: 'algorithms', name: '算法', parentId: null, color: '#34d399', order: 3 },

    { id: 'systems', name: '系统与工程', parentId: null, color: '#f472b6', order: 4 }
  ],

  knowledgePoints: [
    {
      id: 'os-process', title: '进程与线程', categoryId: 'foundations', tags: ['进程', '线程', '并发'],
      summary: '进程是资源分配单位，线程是调度单位',
      updatedAt: '2026-10-30T15:42:00+08:00',
      content: `<p><strong>一句话：</strong>进程是操作系统进行资源分配的基本单位，线程是 CPU 调度的基本单位。</p>
<h3>关键点</h3>
<ul>
  <li>进程有独立地址空间；同一进程内的线程共享地址空间。</li>
  <li>线程切换开销小于进程切换，但一个线程崩溃可能拖垮整个进程。</li>
  <li>进程状态：新建 → 就绪 → 运行 → 阻塞 → 终止。</li>
</ul>
<pre><code># 查看进程与线程
ps -eLf | head</code></pre>
<blockquote>面试常问：进程间通信方式有哪些？（管道、消息队列、共享内存、信号、Socket）</blockquote>`
    },
    {
      id: 'os-scheduling', title: '进程调度', categoryId: 'foundations', tags: ['调度', 'CFS', 'Linux'],
      summary: '决定哪个就绪进程获得 CPU',
      updatedAt: '2026-10-30T14:20:00+08:00',
      content: `<p><strong>一句话：</strong>调度器在就绪队列中选择下一个运行的进程。</p>
<h3>常见算法</h3>
<ul>
  <li>FCFS：先来先服务，简单但可能产生护航效应。</li>
  <li>SJF：最短作业优先，平均等待时间最优，但需要预知运行时间。</li>
  <li>RR：时间片轮转，保证响应性。</li>
  <li>CFS：Linux 的完全公平调度，用 vruntime 近似公平。</li>
</ul>
<pre><code>vruntime += delta_exec * (NICE_0_LOAD / weight)</code></pre>
<blockquote>权衡：吞吐量、响应时间、公平性、实时性通常无法同时最优。</blockquote>`
    },
    {
      id: 'os-memory', title: '内存分页', categoryId: 'foundations', tags: ['分页', '页表', 'TLB'],
      summary: '把虚拟地址映射到物理页框',
      updatedAt: '2026-10-28T21:10:00+08:00',
      content: `<p><strong>一句话：</strong>分页把虚拟地址空间切成固定大小的页，通过页表映射到物理页框。</p>
<h3>关键点</h3>
<ul>
  <li>虚拟地址 = 页号 + 页内偏移；MMU 查页表完成翻译。</li>
  <li>TLB 缓存最近的页表项，减少内存访问次数。</li>
  <li>多级页表用时间换空间，避免为整个地址空间维护大页表。</li>
</ul>
<blockquote>页表项通常包含：物理页框号、有效位、读写权限、脏位、访问位。</blockquote>`
    },
    {
      id: 'os-vm', title: '虚拟内存', categoryId: 'foundations', tags: ['缺页', '置换', 'LRU'],
      summary: '用磁盘扩展可用的地址空间',
      updatedAt: '2026-10-29T20:05:00+08:00',
      content: `<p><strong>一句话：</strong>虚拟内存让进程以为自己拥有连续的大地址空间，实际只把用到的页装入内存。</p>
<h3>关键点</h3>
<ul>
  <li>缺页中断：访问的页不在内存时，由内核装入。</li>
  <li>页面置换算法：FIFO、LRU、Clock、OPT（理论最优）。</li>
  <li>抖动（thrashing）：频繁换页导致 CPU 利用率下降。</li>
</ul>
<pre><code>局部性原理：时间局部性 + 空间局部性</code></pre>`
    },
    {
      id: 'os-deadlock', title: '死锁', categoryId: 'foundations', tags: ['死锁', '银行家算法'],
      summary: '多个进程互相等待对方持有的资源',
      updatedAt: '2026-10-27T10:30:00+08:00',
      content: `<p><strong>一句话：</strong>死锁是多个进程因竞争资源而互相等待、无法推进的状态。</p>
<h3>四个必要条件</h3>
<ul>
  <li>互斥、占有并等待、不可剥夺、循环等待。</li>
</ul>
<h3>处理策略</h3>
<ul>
  <li>预防：破坏任一必要条件（如资源有序分配）。</li>
  <li>避免：银行家算法，在分配前判断是否进入不安全状态。</li>
  <li>检测与恢复：资源分配图 + 回滚/终止进程。</li>
</ul>`
    },

    {
      id: 'net-tcp', title: 'TCP 三次握手', categoryId: 'foundations', tags: ['TCP', '握手', 'TIME_WAIT'],
      summary: '建立可靠连接需要三次报文交换',
      updatedAt: '2026-10-30T11:05:00+08:00',
      content: `<p><strong>一句话：</strong>三次握手用于同步双方初始序列号并确认收发能力。</p>
<h3>过程</h3>
<ol>
  <li>客户端 → 服务端：SYN，seq=x。</li>
  <li>服务端 → 客户端：SYN+ACK，seq=y，ack=x+1。</li>
  <li>客户端 → 服务端：ACK，ack=y+1。</li>
</ol>
<blockquote>为什么不是两次？防止历史失效连接请求突然到达，导致服务端建立错误连接。</blockquote>`
    },
    {
      id: 'net-http', title: 'HTTP 与 HTTPS', categoryId: 'foundations', tags: ['HTTP', 'HTTPS', 'TLS'],
      summary: '应用层协议与它的加密版本',
      updatedAt: '2026-10-29T18:40:00+08:00',
      content: `<p><strong>一句话：</strong>HTTP 是无状态的应用层协议；HTTPS = HTTP + TLS。</p>
<h3>关键点</h3>
<ul>
  <li>HTTP/1.1 持久连接、管线化；HTTP/2 多路复用；HTTP/3 基于 QUIC。</li>
  <li>HTTPS 通过证书验证身份、协商会话密钥，提供机密性与完整性。</li>
  <li>常见缓存头：Cache-Control、ETag、Last-Modified。</li>
</ul>
<pre><code>GET /api/notes HTTP/1.1
Host: example.com</code></pre>`
    },
    {
      id: 'net-dns', title: 'DNS 解析', categoryId: 'foundations', tags: ['DNS', '递归', '缓存'],
      summary: '把域名解析为 IP 地址',
      updatedAt: '2026-10-26T09:15:00+08:00',
      content: `<p><strong>一句话：</strong>DNS 负责把域名翻译成 IP 地址，是互联网的分布式电话簿。</p>
<h3>关键点</h3>
<ul>
  <li>递归查询与迭代查询；根、顶级域、权威域名服务器。</li>
  <li>常见记录：A、AAAA、CNAME、MX、TXT。</li>
  <li>缓存与 TTL 影响解析速度和变更生效时间。</li>
</ul>`
    },

    {
      id: 'ds-array', title: '数组与链表', categoryId: 'foundations', tags: ['数组', '链表', '复杂度'],
      summary: '连续内存与链式存储的取舍',
      updatedAt: '2026-10-25T22:00:00+08:00',
      content: `<p><strong>一句话：</strong>数组随机访问快，链表插入删除灵活，但都有各自的代价。</p>
<h3>复杂度对比</h3>
<ul>
  <li>数组：访问 O(1)，中间插入/删除 O(n)。</li>
  <li>链表：访问 O(n)，已知节点插入/删除 O(1)。</li>
</ul>
<blockquote>实际性能还受缓存局部性影响：数组通常比链表更缓存友好。</blockquote>`
    },
    {
      id: 'ds-hash', title: '哈希表', categoryId: 'foundations', tags: ['哈希', '冲突', '负载因子'],
      summary: '用哈希函数把键映射到桶',
      updatedAt: '2026-10-28T16:25:00+08:00',
      content: `<p><strong>一句话：</strong>哈希表通过哈希函数实现平均 O(1) 的查找、插入和删除。</p>
<h3>关键点</h3>
<ul>
  <li>冲突处理：链地址法、开放寻址（线性探测、二次探测、双哈希）。</li>
  <li>负载因子过高时需要扩容并重新哈希。</li>
  <li>哈希函数应尽量均匀，避免聚集。</li>
</ul>`
    },
    {
      id: 'ds-tree', title: '二叉树', categoryId: 'foundations', tags: ['二叉树', '遍历', 'BST'],
      summary: '递归结构、遍历方式与二叉搜索树',
      updatedAt: '2026-10-24T14:50:00+08:00',
      content: `<p><strong>一句话：</strong>二叉树每个节点最多两个子节点，遍历方式决定访问顺序。</p>
<h3>四种遍历</h3>
<ul>
  <li>前序：根 → 左 → 右；中序：左 → 根 → 右；后序：左 → 右 → 根；层序：BFS。</li>
  <li>BST 的中序遍历是有序序列。</li>
  <li>平衡树（AVL/红黑树）把树高控制在 O(log n)。</li>
</ul>`
    },
    {
      id: 'ds-graph', title: '图遍历', categoryId: 'foundations', tags: ['BFS', 'DFS', '最短路'],
      summary: 'BFS/DFS 与拓扑排序、最短路',
      updatedAt: '2026-10-27T19:30:00+08:00',
      content: `<p><strong>一句话：</strong>图由顶点和边组成，BFS/DFS 是遍历图的两把基础工具。</p>
<h3>关键点</h3>
<ul>
  <li>BFS 用队列，适合无权图最短路；DFS 用栈/递归，适合连通性与回溯。</li>
  <li>拓扑排序用于有向无环图（DAG）。</li>
  <li>Dijkstra 适合非负权；Bellman-Ford 可处理负权边。</li>
</ul>`
    },

    {
      id: 'cpp-pointer', title: '指针与引用', categoryId: 'languages', tags: ['指针', '引用', '内存'],
      summary: 'C++ 中访问内存的两种方式',
      updatedAt: '2026-10-29T10:10:00+08:00',
      content: `<p><strong>一句话：</strong>指针保存地址，引用是变量的别名；引用必须初始化且不能改绑。</p>
<h3>关键点</h3>
<ul>
  <li>指针可以为空、可以重新赋值；引用通常不可为空。</li>
  <li>悬垂指针：指向已释放内存，解引用是未定义行为。</li>
  <li>所有权不清晰是内存错误的主要来源。</li>
</ul>
<pre><code>int x = 1;
int* p = &amp;x;
int&amp; r = x;</code></pre>`
    },
    {
      id: 'cpp-raii', title: 'RAII 与智能指针', categoryId: 'languages', tags: ['RAII', 'unique_ptr', '异常安全'],
      summary: '用对象生命周期管理资源',
      updatedAt: '2026-10-23T20:45:00+08:00',
      content: `<p><strong>一句话：</strong>RAII 把资源获取放在构造函数、释放放在析构函数，依靠对象生命周期自动管理资源。</p>
<h3>关键点</h3>
<ul>
  <li>unique_ptr 独占所有权；shared_ptr 共享所有权；weak_ptr 打破循环引用。</li>
  <li>RAII 同时提升异常安全性：栈展开时析构函数会被调用。</li>
  <li>优先使用智能指针和容器，少写裸 new/delete。</li>
</ul>`
    },
    {
      id: 'py-gil', title: 'GIL', categoryId: 'languages', tags: ['GIL', '多线程', '多进程'],
      summary: 'CPython 的全局解释器锁',
      updatedAt: '2026-10-28T09:40:00+08:00',
      content: `<p><strong>一句话：</strong>GIL 让同一时刻只有一个线程执行 Python 字节码。</p>
<h3>影响</h3>
<ul>
  <li>CPU 密集型多线程无法利用多核，应使用多进程。</li>
  <li>I/O 密集型多线程仍然有效，因为 I/O 等待时会释放 GIL。</li>
  <li>GIL 是 CPython 实现细节，不是 Python 语言规范。</li>
</ul>`
    },
    {
      id: 'py-gen', title: '生成器', categoryId: 'languages', tags: ['生成器', 'yield', '迭代器'],
      summary: '惰性求值的迭代方式',
      updatedAt: '2026-10-22T11:20:00+08:00',
      content: `<p><strong>一句话：</strong>生成器用 yield 逐个产出值，适合处理大数据流。</p>
<h3>关键点</h3>
<ul>
  <li>调用生成器函数不会立即执行，而是返回生成器对象。</li>
  <li>yield 会暂停函数状态，next() 时恢复。</li>
  <li>生成器表达式比列表推导式更省内存。</li>
</ul>
<pre><code>def fib():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b</code></pre>`
    },

    {
      id: 'algo-quick', title: '快速排序', categoryId: 'algorithms', tags: ['快排', '分治', 'partition'],
      summary: '选基准、分区、递归排序',
      updatedAt: '2026-10-30T09:30:00+08:00',
      content: `<p><strong>一句话：</strong>快速排序通过 partition 把数组分成小于/大于基准的两部分，再递归排序。</p>
<h3>复杂度</h3>
<ul>
  <li>平均 O(n log n)，最坏 O(n²)（已排序 + 固定基准）。</li>
  <li>原地排序，平均空间 O(log n)（递归栈）。</li>
  <li>随机基准或三数取中可降低最坏情况概率。</li>
</ul>`
    },
    {
      id: 'algo-merge', title: '归并排序', categoryId: 'algorithms', tags: ['归并', '分治', '稳定排序'],
      summary: '分治合并，稳定 O(n log n)',
      updatedAt: '2026-10-21T16:10:00+08:00',
      content: `<p><strong>一句话：</strong>归并排序把数组递归二分，再合并两个有序子数组。</p>
<h3>关键点</h3>
<ul>
  <li>时间复杂度稳定 O(n log n)，需要 O(n) 额外空间。</li>
  <li>稳定排序，适合对稳定性有要求的场景。</li>
  <li>外排序中常用归并思想处理超大数据。</li>
</ul>`
    },
    {
      id: 'algo-dp', title: '动态规划', categoryId: 'algorithms', tags: ['DP', '状态转移', '记忆化'],
      summary: '用状态与转移避免重复计算',
      updatedAt: '2026-10-29T22:15:00+08:00',
      content: `<p><strong>一句话：</strong>动态规划把大问题拆成重叠子问题，保存子问题解避免重复计算。</p>
<h3>解题步骤</h3>
<ol>
  <li>定义状态：dp[i] 表示什么。</li>
  <li>找转移方程。</li>
  <li>确定初始条件与遍历顺序。</li>
  <li>考虑空间优化。</li>
</ol>
<blockquote>能不用 DP 就不用；先想暴力，再找重叠子问题。</blockquote>`
    },
    {
      id: 'algo-knapsack', title: '0/1 背包', categoryId: 'algorithms', tags: ['背包', 'DP', '滚动数组'],
      summary: '每个物品选或不选的最大价值',
      updatedAt: '2026-10-30T08:05:00+08:00',
      content: `<p><strong>一句话：</strong>0/1 背包在容量限制下选择物品，使总价值最大。</p>
<h3>状态与转移</h3>
<pre><code>dp[j] = max(dp[j], dp[j - w[i]] + v[i])
// 一维数组时需要倒序遍历容量</code></pre>
<ul>
  <li>时间复杂度 O(n × capacity)，空间 O(capacity)。</li>
  <li>完全背包与 0/1 背包的遍历顺序不同。</li>
</ul>`
    },

    {
      id: 'linux-perm', title: '文件权限', categoryId: 'systems', tags: ['chmod', 'rwx', 'umask'],
      summary: 'rwx 与用户/组/其他',
      updatedAt: '2026-10-20T10:00:00+08:00',
      content: `<p><strong>一句话：</strong>Linux 用 rwx 三位一组表示属主、属组、其他用户的权限。</p>
<h3>常用命令</h3>
<pre><code>chmod 755 script.sh
chown user:group file
umask</code></pre>
<ul>
  <li>目录的 x 表示可进入，r 表示可列出内容。</li>
  <li>6377 这类数字第一位是特殊权限（setuid/setgid/sticky）。</li>
</ul>`
    },
    {
      id: 'linux-pipe', title: '管道与重定向', categoryId: 'systems', tags: ['pipe', 'stdin', 'stdout'],
      summary: '把命令的输入输出连接起来',
      updatedAt: '2026-10-19T15:30:00+08:00',
      content: `<p><strong>一句话：</strong>管道把前一个命令的 stdout 接到后一个命令的 stdin。</p>
<h3>常用形式</h3>
<pre><code>ls -la | grep ".md"
echo hello &gt; out.txt
command 2&gt;&amp;1</code></pre>
<ul>
  <li>&gt; 覆盖，&gt;&gt; 追加；2&gt; 重定向 stderr。</li>
  <li>管道是进程间通信的一种形式。</li>
</ul>`
    },
    {
      id: 'db-index', title: '索引', categoryId: 'systems', tags: ['B+树', '索引', '最左前缀'],
      summary: '用额外结构加速查询',
      updatedAt: '2026-10-28T14:00:00+08:00',
      content: `<p><strong>一句话：</strong>索引是加速查询的额外数据结构，常见实现是 B+ 树。</p>
<h3>关键点</h3>
<ul>
  <li>聚簇索引决定数据物理顺序；二级索引存储主键值。</li>
  <li>联合索引遵循最左前缀原则。</li>
  <li>索引会增加写入成本与存储空间，不是越多越好。</li>
</ul>`
    },
    {
      id: 'db-tx', title: '事务隔离', categoryId: 'systems', tags: ['ACID', 'MVCC', '隔离级别'],
      summary: 'ACID 与四种隔离级别',
      updatedAt: '2026-10-30T13:25:00+08:00',
      content: `<p><strong>一句话：</strong>事务用隔离级别在并发正确性和性能之间做权衡。</p>
<h3>ACID</h3>
<ul>
  <li>原子性、一致性、隔离性、持久性。</li>
</ul>
<h3>隔离级别</h3>
<ul>
  <li>读未提交、读已提交、可重复读、串行化。</li>
  <li>可能出现的异常：脏读、不可重复读、幻读。</li>
  <li>MVCC 通过版本链实现一致性读，减少锁竞争。</li>
</ul>`
    }
  ],

  manualRelations: [
    { from: 'os-process', to: 'os-scheduling', type: 'prerequisite' },
    { from: 'os-scheduling', to: 'os-deadlock', type: 'related' },
    { from: 'os-memory', to: 'os-vm', type: 'prerequisite' },
    { from: 'os-vm', to: 'os-deadlock', type: 'related' },
    { from: 'net-tcp', to: 'net-http', type: 'prerequisite' },
    { from: 'net-http', to: 'net-dns', type: 'related' },
    { from: 'net-tcp', to: 'net-dns', type: 'related' },
    { from: 'ds-array', to: 'ds-hash', type: 'contrast' },
    { from: 'ds-tree', to: 'ds-graph', type: 'related' },
    { from: 'ds-hash', to: 'db-index', type: 'related' },
    { from: 'algo-quick', to: 'algo-merge', type: 'contrast' },
    { from: 'algo-quick', to: 'algo-dp', type: 'related' },
    { from: 'algo-dp', to: 'algo-knapsack', type: 'prerequisite' },
    { from: 'cpp-pointer', to: 'cpp-raii', type: 'prerequisite' },
    { from: 'py-gil', to: 'os-process', type: 'related' },
    { from: 'py-gil', to: 'py-gen', type: 'related' },
    { from: 'db-index', to: 'db-tx', type: 'related' },
    { from: 'linux-pipe', to: 'os-process', type: 'related' },
    { from: 'algo-merge', to: 'ds-array', type: 'related' }
  ]
};
