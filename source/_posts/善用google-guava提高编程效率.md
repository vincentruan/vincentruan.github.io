---
title: 善用google guava提高编程效率
date: 2020-03-18 21:07:38
categories: JAVA
tags:
- JAVA
- GUAVA
---

工具类 就是封装平常用的方法，不需要你重复造轮子，节省开发人员时间，提高工作效率。谷歌作为大公司，当然会从日常的工作中提取中很多高效率的方法出来。所以就诞生了guava。。

- 高效设计良好的API，被Google的开发者设计，实现和使用
- 遵循高效的java语法实践
- 使代码更刻度，简洁，简单
- 节约时间，资源，提高生产力

Guava工程包含了若干被Google的 Java项目广泛依赖 的核心库，例如：

1. 集合 [collections]
2. 缓存 [caching]
3. 原生类型支持 [primitives support]
4. 并发库 [concurrency libraries]
5. 通用注解 [common annotations]
6. 字符串处理 [string processing]
7. I/O 等等。

<!-- more -->

# 使用

引入maven依赖(就是引入jar包)

(从版本号就能看出 guava是一步步改进的，并且跟随的jdk不断的提取其中优秀的部分)

```XML
<dependency>
	<groupId>com.google.guava</groupId>
	<artifactId>guava</artifactId>
	<version>20.0</version>
</dependency>
```

# 集合的创建

```java
// 普通Collection的创建
List<String> list = Lists.newArrayList();
Set<String> set = Sets.newHashSet();
Map<String, String> map = Maps.newHashMap();

// 不变Collection的创建
ImmutableList<String> iList = ImmutableList.of("a", "b", "c");
ImmutableSet<String> iSet = ImmutableSet.of("e1", "e2");
ImmutableMap<String, String> iMap = ImmutableMap.of("k1", "v1", "k2", "v2");
```

创建不可变集合 先理解什么是immutable(不可变)对象

1.在多线程操作下，是线程安全的。

2.所有不可变集合会比可变集合更有效的利用资源。

3.中途不可改变

```java
ImmutableList<String> immutableList = ImmutableList.of("1","2","3","4");
```

这句话就声明了一个不可变的list集合，里面有数据1，2，3，4。方法中的==操作集合的方法都声明过期==，并且抛出异常。

没用guava之前是需要声明并且加各种包裹集合才能实现这个功能。

当我们需要一个map中包含key为String value为List类型的时候 以前我们是这样写的

```java
Map<String,List<Integer>> map = new HashMap<String,List<Integer>>();
List<Integer> list = new ArrayList<Integer>();
list.add(1);
list.add(2);
map.put("aa", list);
System.out.println(map.get("aa"));//[1, 2]
```

而现在

```java
Multimap<String,Integer> map = ArrayListMultimap.create();		
map.put("aa", 1);
map.put("aa", 2);
System.out.println(map.get("aa"));  //[1, 2]
```

**其他的黑科技集合**

```markdown
MultiSet: 无序+可重复   count()方法获取单词的次数  增强了可读性+操作简单
创建方式:  Multiset<String> set = HashMultiset.create();

Multimap: key-value  key可以重复  
创建方式: Multimap<String, String> teachers = ArrayListMultimap.create();

BiMap: 双向Map(Bidirectional Map) 键与值都不能重复
创建方式:  BiMap<String, String> biMap = HashBiMap.create();

Table: 双键的Map Map--> Table-->rowKey+columnKey+value  //和sql中的联合主键有点像
创建方式: Table<String, String, Integer> tables = HashBasedTable.create();

...等等(guava中还有很多java里面没有给出的集合类型)
```
## Multiset

JDK的集合，提供了有序且可以重复的List，无序且不可以重复的Set。那这里其实对于集合涉及到了2个概念，一个order，一个dups。那么List vs Set，and then some ?

![img](善用google-guava提高编程效率/640-1584537790400.webp)

Multiset是什么，我想上面的图，你应该了解它的概念了。Multiset就是无序的，但是可以重复的集合，它就是游离在List/Set之间的“灰色地带”！（至于有序的，不允许重复的集合嘛，guava还没有提供，当然在未来应该会提供UniqueList，我猜的，哈哈）

来看一个Multiset的示例：

![img](善用google-guava提高编程效率/640-1584537822424.webp)

Multiset自带一个有用的功能，就是可以跟踪每个对象的数量。

## Immutable vs unmodifiable

来我们先看一个unmodifiable的例子：

![img](善用google-guava提高编程效率/640-1584537847333.webp)

你看到JDK提供的unmodifiable的缺陷了吗？

实际上，Collections.unmodifiableXxx所返回的集合和源集合是同一个对象，只不过可以对集合做出改变的API都被override，会抛出UnsupportedOperationException。

也即是说我们改变源集合，导致不可变视图（unmodifiable View）也会发生变化，oh my god!

当然，在不使用guava的情况下，我们是怎么避免上面的问题的呢？

![img](善用google-guava提高编程效率/640-1584537877732.webp)

上面揭示了一个概念：Defensive Copies，保护性拷贝。

OK，unmodifiable看上去没有问题呢，但是guava依然觉得可以改进，于是提出了Immutable的概念，来看：

![img](善用google-guava提高编程效率/640-1584537893925.png)

就一个copyOf，你不会忘记，如此cheap

用Google官方的说法是：we're using just one class,just say exactly what we mean，很了不起吗（不仅仅是个概念，Immutable在COPY阶段还考虑了线程的并发性等，很智能的！）

guava提供了很多Immutable集合，比如ImmutableList/ImmutableSet/ImmutableSortedSet/ImmutableMap/......

看一个ImmutableMap的例子：

![img](善用google-guava提高编程效率/640-1584537922795.png)

## 可不可以一对多：Multimap

JDK提供给我们的Map是一个键，一个值，一对一的，那么在实际开发中，显然存在一个KEY多个VALUE的情况（比如一个分类下的书本），我们往往这样表达：Map<k,List<v>>，好像有点臃肿！臃肿也就算了，更加不爽的事，我们还得判断KEY是否存在来决定是否new 一个LIST出来，有点麻烦！更加麻烦的事情还在后头，比如遍历，比如删除，so hard......

来看guava如何替你解决这个大麻烦的：

![img](善用google-guava提高编程效率/640-1584537989409.webp)

友情提示下，guava所有的集合都有create方法，这样的好处在于简单，而且我们不必在重复泛型信息了。

get()/keys()/keySet()/values()/entries()/asMap()都是非常有用的返回view collection的方法。

Multimap的实现类有：ArrayListMultimap/HashMultimap/LinkedHashMultimap/TreeMultimap/ImmutableMultimap/......

## 可不可以双向：BiMap

JDK提供的MAP让我们可以find value by key，那么能不能通过find key by value呢，能不能KEY和VALUE都是唯一的呢。这是一个双向的概念，即forward+backward。

在实际场景中有这样的需求吗？比如通过用户ID找到mail，也需要通过mail找回用户名。没有guava的时候，我们需要create forward map AND create backward map，and now just let guava do that for you.

![img](善用google-guava提高编程效率/640-1584538028104.webp)

biMap / biMap.inverse() / biMap.inverse().inverse() 它们是什么关系呢？

你可以稍微看一下BiMap的源码实现，实际上，当你创建BiMap的时候，在内部维护了2个map，一个forward map，一个backward map，并且设置了它们之间的关系。

因此，biMap.inverse()  != biMap ；biMap.inverse().inverse() == biMap

## 可不可以多个KEY：Table

我们知道数据库除了主键外，还提供了复合索引，而且实际中这样的多级关系查找也是比较多的，当然我们可以利用嵌套的Map来实现：Map<k1,Map<k2,v2>>。为了让我们的代码看起来不那么丑陋，guava为我们提供了Table。

![img](善用google-guava提高编程效率/640-1584538088906.webp)

Table涉及到3个概念：rowKey,columnKey,value，并提供了多种视图以及操作方法让你更加轻松的处理多个KEY的场景。

# 将集合转换为特定规则的字符串

以前我们将list转换为特定规则的字符串是这样写的:

```
//use java
List<String> list = new ArrayList<String>();
list.add("aa");
list.add("bb");
list.add("cc");
String str = "";
for(int i=0; i<list.size(); i++){
	str = str + "-" +list.get(i);
}
//str 为-aa-bb-cc

//use guava
List<String> list = new ArrayList<String>();
list.add("aa");
list.add("bb");
list.add("cc");
String result = Joiner.on("-").join(list);
//result为  aa-bb-cc
```

## 把map集合转换为特定规则的字符串

```java
Map<String, Integer> map = Maps.newHashMap();
map.put("xiaoming", 12);
map.put("xiaohong",13);
String result = Joiner.on(",").withKeyValueSeparator("=").join(map);
// result为 xiaoming=12,xiaohong=13
```

# 将String转换为特定的集合

```java
//use java
List<String> list = new ArrayList<String>();
String a = "1-2-3-4-5-6";
String[] strs = a.split("-");
for(int i=0; i<strs.length; i++){
	list.add(strs[i]);
}

//use guava
String str = "1-2-3-4-5-6";
List<String> list = Splitter.on("-").splitToList(str);
//list为  [1, 2, 3, 4, 5, 6]
```

如果

```java
str="1-2-3-4- 5-  6  ";
```

guava还可以使用

> ==使用 "-" 切分字符串并去除空串与空格== omitEmptyStrings().trimResults() 去除空串与空格

```java
String str = "1-2-3-4-  5-  6   ";  
List<String> list = Splitter.on("-").omitEmptyStrings().trimResults().splitToList(str);
System.out.println(list);
```

就能忽略中间的空格

## 将String转换为map

```java
String str = "xiaoming=11,xiaohong=23";
Map<String,String> map = Splitter.on(",").withKeyValueSeparator("=").split(str);
```

比如String提供的split方法，我们得关心空字符串吧，还得考虑返回的结果中存在null元素吧，只提供了前后trim的方法（如果我想对中间元素进行trim呢）。

那么，看下面的代码示例，guava让你不必在操心这些：

![img](善用google-guava提高编程效率/640-1584537619245.webp)

Joiner是连接器，Splitter是分割器，通常我们会把它们定义为static final，利用on生成对象后在应用到String进行处理，这是可以复用的。要知道apache commons StringUtils提供的都是static method。更加重要的是，guava提供的Joiner/Splitter是经过充分测试，它的稳定性和效率要比apache高出不少，这个你可以自行测试下。

发现没有我们想对String做什么操作，就是生成自己定制化的Joiner/Splitter，多么直白，简单，流畅的API！

对于Joiner，常用的方法是  跳过NULL元素：skipNulls()  /  对于NULL元素使用其他替代：useForNull(String)

对于Splitter，常用的方法是：trimResults()/omitEmptyStrings()。注意拆分的方式，有字符串，还有正则，还有固定长度分割（太贴心了！）

其实除了Joiner/Splitter外，guava还提供了字符串匹配器：CharMatcher

![img](善用google-guava提高编程效率/640-1584537629986.webp)

CharMatcher，将字符的匹配和处理解耦，并提供丰富的方法供你使用！

# guava还支持多个字符切割，或者特定的正则分隔

```java
String input = "aa.dd,,ff,,.";
List<String> result = Splitter.onPattern("[.|,]").omitEmptyStrings().splitToList(input);
```

==关于字符串的操作 都是在Splitter这个类上进行的。==

```java
// 判断匹配结果
boolean result = CharMatcher.inRange('a', 'z').or(CharMatcher.inRange('A', 'Z')).matches('K'); //true
// 保留数字文本
String s1 = CharMatcher.digit().retainFrom("abc 123 efg"); //123
// 删除数字文本
String s2 = CharMatcher.digit().removeFrom("abc 123 efg");    //abc  efg
```

# 集合的过滤

我们对于集合的过滤，思路就是迭代，然后再具体对每一个数判断，这样的代码放在程序中，难免会显得很臃肿，虽然功能都有，但是很不好看。

guava写法

```java
//按照条件过滤
ImmutableList<String> names = ImmutableList.of("begin", "code", "Guava", "Java");
Iterable<String> fitered = Iterables.filter(names, Predicates.or(Predicates.equalTo("Guava"), Predicates.equalTo("Java")));
System.out.println(fitered); // [Guava, Java]

//自定义过滤条件   使用自定义回调方法对Map的每个Value进行操作
ImmutableMap<String, Integer> m = ImmutableMap.of("begin", 12, "code", 15);
        // Function<F, T> F表示apply()方法input的类型，T表示apply()方法返回类型
        Map<String, Integer> m2 = Maps.transformValues(m, new Function<Integer, Integer>() {
            public Integer apply(Integer input) {
            	if(input>12){
            		return input;
            	}else{
            		return input+1;
            	}
            }
        });
System.out.println(m2);   //{begin=13, code=15}
```

set的交集, 并集, 差集

```java
HashSet setA = newHashSet(1, 2, 3, 4, 5);  
HashSet setB = newHashSet(4, 5, 6, 7, 8);  
   
SetView union = Sets.union(setA, setB);  
System.out.println("union:");  
for (Integer integer : union)  
    System.out.println(integer);           //union:12345867
   
SetView difference = Sets.difference(setA, setB);  
System.out.println("difference:");  
for (Integer integer : difference)  
    System.out.println(integer);        //difference:123
   
SetView intersection = Sets.intersection(setA, setB);  
System.out.println("intersection:");  
for (Integer integer : intersection)  
    System.out.println(integer);  //intersection:45

    
```

map的交集，并集，差集

```java
MapDifference differenceMap = Maps.difference(mapA, mapB);  
differenceMap.areEqual();  
Map entriesDiffering = differenceMap.entriesDiffering();  
Map entriesOnlyOnLeft = differenceMap.entriesOnlyOnLeft();  
Map entriesOnlyOnRight = differenceMap.entriesOnlyOnRight();  
Map entriesInCommon = differenceMap.entriesInCommon();  
```

# 检查参数

```java
//use java
if(list!=null && list.size()>0)
'''
if(str!=null && str.length()>0)
'''
if(str !=null && !str.isEmpty())

//use guava
if(!Strings.isNullOrEmpty(str))

//use java
if (count <= 0) {                                                                                           
    throw new IllegalArgumentException("must be positive: " + count);         
}    

//use guava
Preconditions.checkArgument(count > 0, "must be positive: %s", count);  
```

免去了很多麻烦！并且会使你的代码看上去更好看。而不是代码里面充斥着!=null， !=""

检查是否为空,不仅仅是字符串类型，其他类型的判断 全部都封装在 Preconditions类里 里面的方法全为静态。

其中的一个方法的源码

```java
@CanIgnoreReturnValue
public static <T> T checkNotNull(T reference) {
    if (reference == null) {
      throw new NullPointerException();
    }
    return reference;
}
```

| 方法声明（不包括额外参数）                         | 描述                                                         | 检查失败时抛出的异常      |
| -------------------------------------------------- | ------------------------------------------------------------ | ------------------------- |
| checkArgument(boolean)                             | 检查boolean是否为true，用来检查传递给方法的参数。            | IllegalArgumentException  |
| checkNotNull(T)                                    | 检查value是否为null，该方法直接返回value，因此可以内嵌使用checkNotNull | NullPointerException      |
| checkState(boolean)                                | 用来检查对象的某些状态。                                     | IllegalStateException     |
| checkElementIndex(int index, int size)             | 检查index作为索引值对某个列表、字符串或数组是否有效。index>=0 && index<size | IndexOutOfBoundsException |
| checkPositionIndexes(int start, int end, int size) | 检查[start, end]表示的位置范围对某个列表、字符串或数组是否有效 | IndexOutOfBoundsException |

# MoreObjects

这个方法是在Objects过期后 官方推荐使用的替代品，该类最大的好处就是不用大量的重写toString，用一种很优雅的方式实现重写，或者在某个场景定制使用。

```java
Person person = new Person("aa",11);
String str = MoreObjects.toStringHelper("Person").add("age", person.getAge()).toString();
System.out.println(str);  
//输出Person{age=11}
```

# 强大的Ordering排序器

排序器[Ordering]是Guava流畅风格比较器[Comparator]的实现，它可以用来为构建复杂的比较器，以完成集合排序的功能。

```markdown
natural()	对可排序类型做自然排序，如数字按大小，日期按先后排序
usingToString()	按对象的字符串形式做字典排序[lexicographical ordering]
from(Comparator)	把给定的Comparator转化为排序器
reverse()	获取语义相反的排序器
nullsFirst()	使用当前排序器，但额外把null值排到最前面。
nullsLast()	使用当前排序器，但额外把null值排到最后面。
compound(Comparator)	合成另一个比较器，以处理当前排序器中的相等情况。
lexicographical()	基于处理类型T的排序器，返回该类型的可迭代对象Iterable<T>的排序器。
onResultOf(Function)	对集合中元素调用Function，再按返回值用当前排序器排序。
Person person = new Person("aa",14);  //String name  ,Integer age
Person ps = new Person("bb",13);
Ordering<Person> byOrdering = Ordering.natural().nullsFirst().onResultOf(new Function<Person,String>(){
	public String apply(Person person){
		return person.age.toString();
	}
});
byOrdering.compare(person, ps);
System.out.println(byOrdering.compare(person, ps)); //1      person的年龄比ps大 所以输出1
```

# 计算中间代码的运行时间

```java
Stopwatch stopwatch = Stopwatch.createStarted();
for(int i=0; i<100000; i++){
	
}
long nanos = stopwatch.elapsed(TimeUnit.MILLISECONDS);
System.out.println(nanos);
```

TimeUnit 可以指定时间输出精确到多少时间

# 文件操作

以前我们写文件读取的时候要定义缓冲区，各种条件判断，各种`$%#$$%#$@#`

而现在我们只需要使用好guava的api 就能使代码变得简洁，并且不用担心因为写错逻辑而背锅了

```java
File file = new File("/test.txt");
List<String> list = null;
try {
	list = Files.readLines(file, Charsets.UTF_8);
} catch (Exception e) {
}

Files.copy(from,to);  //复制文件
Files.deleteDirectoryContents(File directory); //删除文件夹下的内容(包括文件与子文件夹)  
Files.deleteRecursively(File file); //删除文件或者文件夹  
Files.move(File from, File to); //移动文件
URL url = Resources.getResource("abc.xml"); //获取classpath根下的abc.xml文件url
```

Files类中还有许多方法可以用，可以多多翻阅。

# guava缓存

对于大多数互联网项目而言，缓存的重要性，不言而喻！

如果我们的应用系统，并不想使用一些第三方缓存组件（如redis），我们仅仅想在本地有一个功能足够强大的缓存，很可惜JDK提供的那些SET/MAP还不行！

```java
// 缓存的实现
private static final CacheLoader<Long, String> cacheLoader = new CacheLoader<Long, String>() {
    @Override
    public String load(Long key) throws Exception {
        // TODO 从数据库加载数据
        System.out.println("从数据库加载数据");
        return key + ":value";
    }
};

// 定义缓存的策略
private static final LoadingCache<Long, String> loadingCache = CacheBuilder.newBuilder()
        .expireAfterAccess(2, TimeUnit.SECONDS) // 设置在2秒内未访问则过期
        .expireAfterWrite(2, TimeUnit.SECONDS) // 设置缓存在写入2秒后失效
        .refreshAfterWrite(3, TimeUnit.SECONDS) // 设置缓存在写入3秒后，通过CacheLoader的load方法进行刷新
        .maximumSize(100L) // 设置缓存数量上限为100
        .build(cacheLoader);


public static void main(String[] args) throws Exception {
    //loadingCache.put(1L, "James");
    System.out.println(loadingCache.get(1L));
    Thread.sleep(5000L);
    System.out.println(loadingCache.get(1L));
}
```

首先，这是一个本地缓存，guava提供的cache是一个简洁、高效，易于维护的。为什么这么说呢？因为并没有一个单独的线程用于刷新 OR 清理cache，对于cache的操作，都是通过访问/读写带来的，也就是说在读写中完成缓存的刷新操作！

guava的缓存设计的比较巧妙，可以很精巧的使用。guava缓存创建分为两种，一种是CacheLoader,另一种则是callback方式

`CacheLoader`

```java
LoadingCache<String,String> cahceBuilder=CacheBuilder
		        .newBuilder()
		        .build(new CacheLoader<String, String>(){
		            @Override
		            public String load(String key) throws Exception {        
		                String strProValue="hello "+key+"!";                
		                return strProValue;
		            }
		        });        
System.out.println(cahceBuilder.apply("begincode"));  //hello begincode!
System.out.println(cahceBuilder.get("begincode")); //hello begincode!
System.out.println(cahceBuilder.get("wen")); //hello wen!
System.out.println(cahceBuilder.apply("wen")); //hello wen!
System.out.println(cahceBuilder.apply("da"));//hello da!
cahceBuilder.put("begin", "code");
System.out.println(cahceBuilder.get("begin")); //code
```

api中已经把apply声明为过期，声明中推荐使用get方法获取值

callback方式:

```java
 Cache<String, String> cache = CacheBuilder.newBuilder().maximumSize(1000).build();  
	        String resultVal = cache.get("code", new Callable<String>() {  
	            public String call() {  
	                String strProValue="begin "+"code"+"!";                
	                return strProValue;
	            }  
	        });  
 System.out.println("value : " + resultVal); //value : begin code!
```

# 让异步回调更加简单

JDK中提供了Future/FutureTask/Callable来对异步回调进行支持，但是还是看上去挺复杂的，能不能更加简单呢？比如注册一个监听回调。

```java
ExecutorService es = Executors.newFixedThreadPool(3);
ListeningExecutorService listeningExecutorService = MoreExecutors.listeningDecorator(es);

ListenableFuture<?> listenableFuture = listeningExecutorService.submit(() -> {
    if(new Random().nextInt(3) == 2){
        throw new NullPointerException();
    }
    return 1;
});

FutureCallback<Integer> futureCallback = new FutureCallback<Integer>() {
    @Override
    public void onSuccess(@Nullable Integer o) {
        System.out.println("------" + o);
    }

    @Override
    public void onFailure(Throwable throwable) {
        System.out.println("------" + throwable.getMessage());
    }
};

Futures.addCallback(listenableFuture,futureCallback);
```

我们可以通过guava对JDK提供的线程池进行装饰，让其具有异步回调监听功能，然后在设置监听器即可！

# 函数式编程：Funcitons

![img](善用google-guava提高编程效率/640-1584538158262.webp)

上面的代码是为了完成将List集合中的元素，先截取5个长度，然后转成大写。

函数式编程的好处在于在集合遍历操作中提供自定义Function的操作，比如transform转换。我们再也不需要一遍遍的遍历集合，显著的简化了代码！

![img](善用google-guava提高编程效率/640-1584538261806.webp)

对集合的transform操作可以通过Function完成

# 断言：Predicate

![img](善用google-guava提高编程效率/640-1584538385000.webp)

Predicate最常用的功能就是运用在集合的过滤当中！

![img](善用google-guava提高编程效率/640-1584538285569.webp)

需要注意的是Lists并没有提供filter方法，不过你可以使用Collections2.filter完成！

# Optional

Optional用于包含非空对象的不可变对象。 Optional对象，用于不存在值表示null。这个类有各种实用的方法，以方便代码来处理为可用或不可用，而不是检查null值。

## 类声明

​	以下是com.google.common.base.Optional<T>类的声明：

```java
@GwtCompatible(serializable=true)
public abstract class Optional<T>
   extends Object
      implements Serializable
```

## 	类方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static  Optional absent()**  			返回没有包含的参考Optional的实例。 |
| 2    | **abstract Set asSet()**  			返回一个不可变的单集的唯一元素所包含的实例(如果存在);否则为一个空的不可变的集合。 |
| 3    | **abstract boolean equals(Object object)**  			返回true如果对象是一个Optional实例，无论是包含引用彼此相等或两者都不存在。 |
| 4    | **static  Optional fromNullable(T nullableReference)**  			如果nullableReference非空，返回一个包含引用Optional实例;否则返回absent()。 |
| 5    | **abstract T get()**  			返回所包含的实例，它必须存在。 |
| 6    | **abstract int hashCode()**  			返回此实例的哈希码。 |
| 7    | **abstract boolean isPresent()**  			返回true，如果这支架包含一个(非空)的实例。 |
| 8    | **static  Optional of(T reference)**  			返回包含给定的非空引用Optional实例。 |
| 9    | **abstract Optional or(Optional secondChoice)**  			返回此Optional，如果它有一个值存在; 否则返回secondChoice。 |
| 10   | **abstract T or(Supplier supplier)**  			返回所包含的实例(如果存在); 否则supplier.get()。 |
| 11   | **abstract T or(T defaultValue)**  			返回所包含的实例(如果存在);否则为默认值。 |
| 12   | **abstract T orNull()**  			返回所包含的实例(如果存在);否则返回null。 |
| 13   | **static  Iterable presentInstances(Iterable> optionals)**  			从提供的optionals返回每个实例的存在的值，从而跳过absent()。 |
| 14   | **abstract String toString()**  			返回此实例的字符串表示。 |
| 15   | **abstract  Optional transform(Function function)**  			如果实例存在，则它被转换给定的功能;否则absent()被返回。 |

## 	继承的方法

​	这个类继承了以下类的方法：

- ​			java.lang.Object

## 	Optional示例

​	使用所选择的编辑器，创建下面的java程序，比如 C:/> Guava

GuavaTester.java

```java
import com.google.common.base.Optional;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester guavaTester = new GuavaTester();

      Integer value1 =  null;
      Integer value2 =  new Integer(10);
      //Optional.fromNullable - allows passed parameter to be null.
      Optional<Integer> a = Optional.fromNullable(value1);
      //Optional.of - throws NullPointerException if passed parameter is null
      Optional<Integer> b = Optional.of(value2);		

      System.out.println(guavaTester.sum(a,b));
   }

   public Integer sum(Optional<Integer> a, Optional<Integer> b){
      //Optional.isPresent - checks the value is present or not
      System.out.println("First parameter is present: " + a.isPresent());

      System.out.println("Second parameter is present: " + b.isPresent());

      //Optional.or - returns the value if present otherwise returns
      //the default value passed.
      Integer value1 = a.or(new Integer(0));	

      //Optional.get - gets the value, value should be present
      Integer value2 = b.get();

      return value1 + value2;
   }	
}
```

## 验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
First parameter is present: false
Second parameter is present: true
10
```

# Preconditions

在guava中，对于null的处理手段是快速失败，

```java
String name = "";
Preconditions.checkNotNull(name, "name is not null");
Integer age = 30;
Preconditions.checkArgument(age>=18, "your age is under 18");
```

你可以看看guava的源码，很多方法的第一行就是：Preconditions.checkNotNull(elements);

要知道null是模糊的概念，是成功呢，还是失败呢，还是别的什么含义呢？

Preconditions提供静态方法来检查方法或构造函数，被调用是否给定适当的参数。它检查的先决条件。其方法失败抛出IllegalArgumentException。

## 	类声明

​	以下是com.google.common.base.Preconditions类的声明：

```java
@GwtCompatible
public final class Preconditions
   extends Object
```

## 	类方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static void checkArgument(boolean expression)**  			确保涉及的一个或多个参数来调用方法表达式的真相。 |
| 2    | **static void checkArgument(boolean expression, Object errorMessage)**  			确保涉及的一个或多个参数来调用方法表达式的真相。 |
| 3    | **static void checkArgument(boolean expression, String errorMessageTemplate, Object... errorMessageArgs)**  			确保涉及的一个或多个参数来调用方法表达式的真相。 |
| 4    | **static int checkElementIndex(int index, int size)**  			确保索引指定一个数组，列表或尺寸大小的字符串有效的元素。 |
| 5    | **static int checkElementIndex(int index, int size, String desc)**  			确保索引指定一个数组，列表或尺寸大小的字符串有效的元素。 |
| 6    | **static  T checkNotNull(T reference)**  			确保对象引用作为参数传递给调用方法不为空。 |
| 7    | **static  T checkNotNull(T reference, Object errorMessage)**  			确保对象引用作为参数传递给调用方法不为空。 |
| 8    | **static  T checkNotNull(T reference, String errorMessageTemplate, Object... errorMessageArgs)**  			确保对象引用作为参数传递给调用方法不为空。 |
| 9    | **static int checkPositionIndex(int index, int size)**  			确保索引指定一个数组，列表或尺寸大小的字符串的有效位置。 |
| 10   | **static int checkPositionIndex(int index, int size, String desc)**  			确保索引指定一个数组，列表或尺寸大小的字符串的有效位置。 |
| 11   | **static void checkPositionIndexes(int start, int end, int size)**  			确保开始和结束指定数组，列表或字符串大小有效的位置，并按照顺序。 |
| 12   | **static void checkState(boolean expression)**  			确保涉及调用实例的状态，但不涉及任何参数来调用方法表达式的真相。 |
| 13   | **static void checkState(boolean expression, Object errorMessage)**  			确保涉及调用实例的状态，但不涉及任何参数来调用方法表达式的真相。 |
| 14   | **static void checkState(boolean expression, String errorMessageTemplate, Object... errorMessageArgs)**  			确保涉及调用实例的状态，但不涉及任何参数来调用方法表达式的真相。 |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Preconditions 示例

​	使用所选择的编辑器，创建下面的java程序比如 C:/> Guava

*GuavaTester.java*

```java
import com.google.common.base.Preconditions;

public class GuavaTester {

   public static void main(String args[]){
      GuavaTester guavaTester = new GuavaTester();
      try {
         System.out.println(guavaTester.sqrt(-3.0));
      }catch(IllegalArgumentException e){
         System.out.println(e.getMessage());
      }
      try {
         System.out.println(guavaTester.sum(null,3));
      }catch(NullPointerException e){
         System.out.println(e.getMessage());
      }
      try {
         System.out.println(guavaTester.getValue(6));
      }catch(IndexOutOfBoundsException e){
         System.out.println(e.getMessage());
      }
   }

   public double sqrt(double input) throws IllegalArgumentException {
      Preconditions.checkArgument(input > 0.0,
         "Illegal Argument passed: Negative value %s.", input);
      return Math.sqrt(input);
   }	

   public int sum(Integer a, Integer b){
      a = Preconditions.checkNotNull(a,
         "Illegal Argument passed: First parameter is Null.");
      b = Preconditions.checkNotNull(b,
         "Illegal Argument passed: Second parameter is Null.");
      return a+b;
   }

   public int getValue(int input){
      int[] data = {1,2,3,4,5};
      Preconditions.checkElementIndex(input,data.length,
         "Illegal Argument passed: Invalid index.");
      return 0;
   }
}
```

## 验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
Illegal Argument passed: Negative value -3.0.
Illegal Argument passed: First parameter is Null.
Illegal Argument passed: Invalid index. (6) must be less than size (5)
```

# Ordering

Ordering(排序)可以被看作是一个丰富的比较具有增强功能的链接，多个实用方法，多类型排序功能等。

## 	类声明

​	以下是com.google.common.collect.Ordering<T>类的声明：

```java
@GwtCompatible
public abstract class Ordering<T>
   extends Object
      implements Comparator<T>
```

## 	类方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static Ordering allEqual()**  			返回一个排序，它把所有的值相等，说明“没有顺序。”通过这个顺序以任何稳定的排序算法的结果，在改变没有顺序元素。 |
| 2    | **static Ordering arbitrary()**  			返回一个任意顺序对所有对象，其中compare(a, b) == 0 意味着a == b（身份平等）。 |
| 3    | **int binarySearch(List sortedList, T key)**  			搜索排序列表使用键的二进制搜索算法。 |
| 4    | **abstract int compare(T left, T right)**  			比较两个参数的顺序。 |
| 5    | **Ordering compound(Comparator secondaryComparator)**  			返回首先使用排序这一点，但它排序中的“tie”，然后委托给secondaryComparator事件。 |
| 6    | **static  Ordering compound(Iterable> comparators)**  			返回一个排序它尝试每个给定的比较器，以便直到一个非零结果找到，返回该结果，并返回零仅当所有比较器返回零。 |
| 7    | **static  Ordering explicit(List valuesInOrder)**  			返回根据它们出现的定列表中的顺序比较对象进行排序。 |
| 8    | **static  Ordering explicit(T leastValue, T... remainingValuesInOrder)**  			返回根据它们所赋予本方法的顺序进行比较的对象进行排序。 |
| 9    | **static  Ordering from(Comparator comparator)**  			返回基于现有的比较实例进行排序。 |
| 10   | **List greatestOf(Iterable iterable, int k)**  			返回根据这个顺序给出迭代，为了从最大到最小的k个最大的元素。 |
| 11   | **List greatestOf(Iterator iterator, int k)**  			返回从给定的迭代器按照这个顺序，从最大到最小k个最大的元素。 |
| 12   | ** ImmutableList immutableSortedCopy(Iterable elements)**  			返回包含的元素排序这种排序的不可变列表。 |
| 13   | **boolean isOrdered(Iterable iterable)**   			返回true如果在迭代后的第一个的每个元素是大于或等于在它之前，根据该排序的元素。 |
| 14   | **boolean isStrictlyOrdered(Iterable iterable)**  			返回true如果在迭代后的第一个的每个元素是严格比在它之前，根据该排序的元素更大。 |
| 15   | **List leastOf(Iterable iterable, int k)**  			返回根据这个顺序给出迭代，从而从低到最大的k个最低的元素。 |
| 16   | **List leastOf(Iterator elements, int k)**  			返回第k从给定的迭代器，按照这个顺序从最低到最大至少元素。 |
|      |                                                              |
| 17   | **Ordering> lexicographical()**  			返回一个新的排序它通过比较对应元素两两直到非零结果发现排序迭代;规定“字典顺序”。 |
| 18   | **E max(E a, E b)**  			返回两个值按照这个顺序的较大值。 |
| 19   | **E max(E a, E b, E c, E... rest)**  			返回指定的值，根据这个顺序是最大的。 |
| 20   | **E max(Iterable iterable)**  			返回指定的值，根据这个顺序是最大的。 |
| 21   | **E max(Iterator iterator)**  			返回指定的值，根据这个顺序是最大的。 |
| 22   | **E min(E a, E b)**  			返回两个值按照这个顺序的较小者。 |
| 23   | **E min(E a, E b, E c, E... rest)**  			返回最少指定的值，根据这个顺序。 |
| 24   | **E min(Iterable iterable)**  			返回最少指定的值，根据这个顺序。 |
| 25   | **E min(Iterator iterator)**  			返回最少指定的值，根据这个顺序。 |
| 26   | **static  Ordering natural()**  			返回使用值的自然顺序排序序列化。 |
| 27   | **Ordering nullsFirst()**  			返回对待null小于所有其他值，并使用此来比较非空值排序。 |
| 28   | **Ordering nullsLast()**  			返回对待null作为大于所有其他值，并使用这个顺序来比较非空值排序。 |
| 29   | **Ordering onResultOf(Function function)**  			返回一个新的排序在F上，首先应用功能给它们，然后比较使用此这些结果的顺序元素。 |
| 30   | **Ordering reverse()**  			返回相反顺序; 顺序相当于Collections.reverseOrder（Comparator）。 |
| 31   | **List sortedCopy(Iterable elements)**  			返回包含的元素排序此排序可变列表;使用这个只有在结果列表可能需要进一步修改，或可能包含null。 |
| 32   | **static Ordering usingToString()**  			返回由它们的字符串表示的自然顺序，toString()比较对象进行排序。 |

## 	方法继承

​	这个类从以下类继承的方法：

- ​			java.lang.Object

## 	Ordering 示例

​	使用所选择的编辑器，创建下面的java程序比如 C:/> Guava

GuavaTester.java

```java
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import com.google.common.collect.Ordering;

public class GuavaTester {
   public static void main(String args[]){
      List<Integer> numbers = new ArrayList<Integer>();
      numbers.add(new Integer(5));
      numbers.add(new Integer(2));
      numbers.add(new Integer(15));
      numbers.add(new Integer(51));
      numbers.add(new Integer(53));
      numbers.add(new Integer(35));
      numbers.add(new Integer(45));
      numbers.add(new Integer(32));
      numbers.add(new Integer(43));
      numbers.add(new Integer(16));

      Ordering ordering = Ordering.natural();
      System.out.println("Input List: ");
      System.out.println(numbers);		
         
      Collections.sort(numbers,ordering );
      System.out.println("Sorted List: ");
      System.out.println(numbers);
         
      System.out.println("======================");
      System.out.println("List is sorted: " + ordering.isOrdered(numbers));
      System.out.println("Minimum: " + ordering.min(numbers));
      System.out.println("Maximum: " + ordering.max(numbers));
         
      Collections.sort(numbers,ordering.reverse());
      System.out.println("Reverse: " + numbers);

      numbers.add(null);
      System.out.println("Null added to Sorted List: ");
      System.out.println(numbers);		

      Collections.sort(numbers,ordering.nullsFirst());
      System.out.println("Null first Sorted List: ");
      System.out.println(numbers);
      System.out.println("======================");

      List<String> names = new ArrayList<String>();
      names.add("Ram");
      names.add("Shyam");
      names.add("Mohan");
      names.add("Sohan");
      names.add("Ramesh");
      names.add("Suresh");
      names.add("Naresh");
      names.add("Mahesh");
      names.add(null);
      names.add("Vikas");
      names.add("Deepak");

      System.out.println("Another List: ");
      System.out.println(names);

	  Collections.sort(names,ordering.nullsFirst().reverse());
      System.out.println("Null first then reverse sorted list: ");
      System.out.println(names);
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
Input List: 
[5, 2, 15, 51, 53, 35, 45, 32, 43, 16]
Sorted List: 
[2, 5, 15, 16, 32, 35, 43, 45, 51, 53]
======================
List is sorted: true
Minimum: 2
Maximum: 53
Reverse: [53, 51, 45, 43, 35, 32, 16, 15, 5, 2]
Null added to Sorted List: 
[53, 51, 45, 43, 35, 32, 16, 15, 5, 2, null]
Null first Sorted List: 
[null, 2, 5, 15, 16, 32, 35, 43, 45, 51, 53]
======================
Another List: 
[Ram, Shyam, Mohan, Sohan, Ramesh, Suresh, Naresh, Mahesh, null, Vikas, Deepak]
Null first then reverse sorted list: 
[Vikas, Suresh, Sohan, Shyam, Ramesh, Ram, Naresh, Mohan, Mahesh, Deepak, null]
```

# Objects

Objects类提供适用于所有对象，如equals, hashCode等辅助函数

## 	类声明

​	以下是com.google.common.base.Objects类的声明：

```java
@GwtCompatible
public final class Objects
   extends Object
```

## 	类方法

| S.N. | 方法及说明                                                   |
| :--- | :----------------------------------------------------------- |
| 1    | **static boolean equal(Object a, Object b)**  			确定两个可能是空的对象是否相等。 |
| 2    | **static  T firstNonNull(T first, T second)**  			不推荐使用。使用MoreObjects.firstNonNull（T，T）来代替。定于2016年6月去除该方法。 |
| 3    | **static int hashCode(Object... objects)**  			生成多个值的哈希码。 |
| 4    | **static Objects.ToStringHelper toStringHelper(Class clazz)**  			不推荐使用。使用MoreObjects.toStringHelper（Class）来代替。定于2016年6月去除该方法。 |
| 5    | **static Objects.ToStringHelper toStringHelper(Object self)**  			不推荐使用。使用MoreObjects.toStringHelper（Object）来代替。定于2016年6月去除该方法。 |
| 6    | **static Objects.ToStringHelper toStringHelper(String className)**  			不推荐使用。使用MoreObjects.toStringHelper（String）来代替。定于2016年6月去除该方法。 |

## 	方法继承

​	这个类从以下类继承的方法：

- ​			java.lang.Object

## 	Objects 示例

​	使用所选择的编辑器，创建下面的java程序比如 **C:/> Guava**

*GuavaTester.java*

```java
import com.google.common.base.Objects;

public class GuavaTester {
   public static void main(String args[]){
      Student s1 = new Student("Mahesh", "Parashar", 1, "VI");	
      Student s2 = new Student("Suresh", null, 3, null);	
	  
      System.out.println(s1.equals(s2));
      System.out.println(s1.hashCode());	
      System.out.println(
      Objects.toStringHelper(s1)
         .add("Name",s1.getFirstName()+" " + s1.getLastName())
         .add("Class", s1.getClassName())
         .add("Roll No", s1.getRollNo())
         .toString());
   }
}

class Student {
   private String firstName;
   private String lastName;
   private int rollNo;
   private String className;

   public Student(String firstName, String lastName, int rollNo, String className){
      this.firstName = firstName;
      this.lastName = lastName;
      this.rollNo = rollNo;
      this.className = className;		
   }

   @Override
   public boolean equals(Object object){
      if(!(object instanceof Student) || object == null){
         return false;
      }
      Student student = (Student)object;
      // no need to handle null here		
      // Objects.equal("test", "test") == true
      // Objects.equal("test", null) == false
      // Objects.equal(null, "test") == false
      // Objects.equal(null, null) == true		
      return Objects.equal(firstName, student.firstName) // first name can be null
         && Objects.equal(lastName, student.lastName) // last name can be null
         && Objects.equal(rollNo, student.rollNo)	
         && Objects.equal(className, student.className);// class name can be null
   }

   @Override
   public int hashCode(){
      //no need to compute hashCode by self
      return Objects.hashCode(className,rollNo);
   }
   public String getFirstName() {
      return firstName;
   }
   public void setFirstName(String firstName) {
      this.firstName = firstName;
   }
   public String getLastName() {
      return lastName;
   }
   public void setLastName(String lastName) {
      this.lastName = lastName;
   }
   public int getRollNo() {
      return rollNo;
   }
   public void setRollNo(int rollNo) {
      this.rollNo = rollNo;
   }
   public String getClassName() {
      return className;
   }
   public void setClassName(String className) {
      this.className = className;
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
false
85871
Student{Name=Mahesh Parashar, Class=VI, Roll No=1}
```

# Range

Range 表示一个间隔或一个序列。它被用于获取一组数字/串在一个特定范围之内。

## 	类声明

​	以下是com.google.common.collect.Range<C>类的声明：

```java
@GwtCompatible
public final class Range<C extends Comparable>
   extends Object
      implements Predicate<C>, Serializable
```

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static > Range all()**  			返回包含C型的每一个值范围 |
| 2    | **boolean apply(C input)Deprecated.**   			只有提供满足谓词接口;使用包含(C)来代替。 |
| 3    | **static > Range atLeast(C endpoint)**  			返回包含大于或等于终点(endpoint)的所有值的范围内。 |
| 4    | **static > Range atMost(C endpoint)**  			返回包含的所有值小于或等于终点的范围内。 |
| 5    | **Range canonical(DiscreteDomain domain)**  			返回此范围内，在给定域中的规范形式。 |
| 6    | **static > Range closed(C lower, C upper)**  			返回包含大于所有值或等于降低且小于或等于上限的范围内。 |
| 7    | **static > Range closedOpen(C lower, C upper)**  			返回包含大于或等于下限和所有值严格大于上限以下的范围内。 |
| 8    | **boolean contains(C value)**  			返回true，如果值是这个范围的范围之内。 |
| 9    | **boolean containsAll(Iterable values)**  			如果值每一个元素都包含在这个范围内，则返回 true。 |
| 10   | **static > Range downTo(C endpoint, BoundType boundType)**  			返回的范围内的给定的端点，它可以是包容性（闭合）或专用（开），没有上限。 |
| 11   | **static > Range encloseAll(Iterable values)**  			返回包含所有给定值的最小范围内。 |
| 12   | **boolean encloses(Range other)**  			返回true，如果其他的边界不在该范围的边界之外延伸。 |
| 13   | **boolean equals(Object object)**  			返回true，如果对象是具有相同端点和绑定类型，这个范围内的范围。 |
| 14   | **static > Range greaterThan(C endpoint)**  			返回一个包含所有值严格大于端点的范围内。 |
| 15   | **int hashCode()**  			返回此范围内的哈希码。       |
| 16   | **boolean hasLowerBound()**  			如果此范围内具有更低的终点返回true。 |
| 17   | **boolean hasUpperBound()**  			如果此范围内有上端点返回true。 |
| 18   | **Range intersection(Range connectedRange)**  			返回由两者范围和connectedRange封闭，如果这样的范围存在的最大范围。 |
| 19   | **boolean isConnected(Range other)**  			如果存在这是由两者此范围和其他封闭（可能为空）的范围，则返回true。 |
| 20   | **boolean isEmpty()**  			返回true，如果这个范围是形式 [v..v)  或 (v..v]. |
| 21   | **static > Range lessThan(C endpoint)**  			返回一个包含所有值严格小于端点的范围内。 |
| 22   | **BoundType lowerBoundType()**  			返回类型这个范围的下限：如果范围包括它的下端点BoundType.CLOSED，如果没有BoundType.OPEN。 |
| 23   | **C lowerEndpoint()**  			返回该范围的较低端点。    |
| 24   | **static > Range open(C lower, C upper)**  			返回一个包含所有值严格大于下限和严格比上端更小一个范围。 |
| 25   | **static > Range openClosed(C lower, C upper)**  			返回包含所有值严格低于更大且小于或等于上限的范围内。 |
| 26   | **static > Range range(C lower, BoundType lowerType, C upper, BoundType upperType)**  			返回包含任何值由下到上，每个端点可以是包容性（关闭）或专用（开）的范围。 |
| 27   | **static > Range singleton(C value)**  			返回包含只在给定范围内的值。 |
| 28   | **Range span(Range other)**  			返回最小的范围包围两者这个范围和other等。 |
| 29   | **String toString()**  			返回该范围内的字符串表示，如“[3..5）”（其他实例列在类文档）。 |
| 30   | **BoundType upperBoundType()**  			返回类型此范围的上限：如果范围包括其上的端点返回BoundType.CLOSED，如果没有返回BoundType.OPEN。 |
| 31   | **C upperEndpoint()**  			返回此范围的上限端点。    |
| 32   | **static > Range upTo(C endpoint, BoundType boundType)**  			返回一个范围，没有下限到给定的端点，它可以是包容性（闭合）或专用（开）。 |

## 	方法继承

​	这个类从以下类继承的方法：

- ​			java.lang.Object

## 	Range 例子

​	选择使用任何编辑器创建以下java程序在 **C:/> Guava**

​	*GuavaTester.java*

```java
import com.google.common.collect.ContiguousSet;
import com.google.common.collect.DiscreteDomain;
import com.google.common.collect.Range;
import com.google.common.primitives.Ints;

public class GuavaTester {

   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testRange();
   }

   private void testRange(){

      //create a range [a,b] = { x | a <= x <= b}
      Range<Integer> range1 = Range.closed(0, 9);	
      System.out.print("[0,9] : ");
      printRange(range1);		
      System.out.println("5 is present: " + range1.contains(5));
      System.out.println("(1,2,3) is present: " + range1.containsAll(Ints.asList(1, 2, 3)));
      System.out.println("Lower Bound: " + range1.lowerEndpoint());
      System.out.println("Upper Bound: " + range1.upperEndpoint());

      //create a range (a,b) = { x | a < x < b}
      Range<Integer> range2 = Range.open(0, 9);
      System.out.print("(0,9) : ");
      printRange(range2);

      //create a range (a,b] = { x | a < x <= b}
      Range<Integer> range3 = Range.openClosed(0, 9);
      System.out.print("(0,9] : ");
      printRange(range3);

      //create a range [a,b) = { x | a <= x < b}
      Range<Integer> range4 = Range.closedOpen(0, 9);
      System.out.print("[0,9) : ");
      printRange(range4);

      //create an open ended range (9, infinity
      Range<Integer> range5 = Range.greaterThan(9);
      System.out.println("(9,infinity) : ");
      System.out.println("Lower Bound: " + range5.lowerEndpoint());
      System.out.println("Upper Bound present: " + range5.hasUpperBound());

      Range<Integer> range6 = Range.closed(3, 5);	
      printRange(range6);

      //check a subrange [3,5] in [0,9]
      System.out.println("[0,9] encloses [3,5]:" + range1.encloses(range6));

      Range<Integer> range7 = Range.closed(9, 20);	
      printRange(range7);
      //check ranges to be connected		
      System.out.println("[0,9] is connected [9,20]:" + range1.isConnected(range7));

      Range<Integer> range8 = Range.closed(5, 15);	

      //intersection
      printRange(range1.intersection(range8));

      //span
      printRange(range1.span(range8));
   }

   private void printRange(Range<Integer> range){		
      System.out.print("[ ");
      for(int grade : ContiguousSet.create(range, DiscreteDomain.integers())) {
         System.out.print(grade +" ");
      }
      System.out.println("]");
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
[0,9] : [ 0 1 2 3 4 5 6 7 8 9 ]
5 is present: true
(1,2,3) is present: true
Lower Bound: 0
Upper Bound: 9
(0,9) : [ 1 2 3 4 5 6 7 8 ]
(0,9] : [ 1 2 3 4 5 6 7 8 9 ]
[0,9) : [ 0 1 2 3 4 5 6 7 8 ]
(9,infinity) : 
Lower Bound: 9
Upper Bound present: false
[ 3 4 5 ]
[0,9] encloses [3,5]:true
[ 9 10 11 12 13 14 15 16 17 18 19 20 ]
[0,9] is connected [9,20]:true
[ 5 6 7 8 9 ]
[ 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 ]
```

# Throwables

Throwable类提供了相关的Throwable接口的实用方法。

## 	类声明

​	以下是com.google.common.base.Throwables类的声明：

```java
public final class Throwables
   extends Object
```

## 	类方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static List getCausalChain(Throwable throwable)**  			获取一个Throwable的原因链的列表。 |
| 2    | **static Throwable getRootCause(Throwable throwable)**  			返回抛出的最里面的原因。 |
| 3    | **static String getStackTraceAsString(Throwable throwable)**  			返回包含toString()的结果字符串，随后完整抛出，递归的堆栈跟踪。 |
| 4    | **static RuntimeException propagate(Throwable throwable)**  			传播抛出原样如果RuntimeException或Error是一个实例，否则作为最后的报告，把它包装在一个RuntimeException，然后传播。 |
| 5    | **static  void propagateIfInstanceOf(Throwable throwable, Class declaredType)**  			传播抛出对象完全按原样，当且仅当它是declaredType的一个实例。 |
| 6    | **static void propagateIfPossible(Throwable throwable)**  			传播抛出对象完全按原样，当且仅当它是RuntimeException或Error的一个实例。 |
| 7    | **static  void propagateIfPossible(Throwable throwable, Class declaredType)**  			传播抛出对象完全按原样，当且仅当它是RuntimeException，错误或的declaredType的一个实例。 |
| 8    | **static void propagateIfPossible(Throwable throwable, Class declaredType1, Class declaredType2)**  			传播抛出对象完全按原样，当且仅当它是RuntimeException，Error，declaredType1或declaredType2的一个实例。 |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Throwables示例

​	创建使用所选择的任何编辑器下面的java程序，比如 **C:/> Guava**

*GuavaTester.java*

```java
import java.io.IOException;

import com.google.common.base.Objects;
import com.google.common.base.Throwables;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      try {
         tester.showcaseThrowables();
      } catch (InvalidInputException e) {
         //get the root cause
         System.out.println(Throwables.getRootCause(e));
      }catch (Exception e) {
         //get the stack trace in string format
         System.out.println(Throwables.getStackTraceAsString(e));				
      }

      try {
         tester.showcaseThrowables1();			
      }catch (Exception e) {
         System.out.println(Throwables.getStackTraceAsString(e));				
      }
   }

   public void showcaseThrowables() throws InvalidInputException{
      try {
         sqrt(-3.0);			
      } catch (Throwable e) {
         //check the type of exception and throw it
         Throwables.propagateIfInstanceOf(e, InvalidInputException.class);		
         Throwables.propagate(e);
      }	
   }

   public void showcaseThrowables1(){
      try {			
         int[] data = {1,2,3}; 
         getValue(data, 4);			
      } catch (Throwable e) {        
         Throwables.propagateIfInstanceOf(e, IndexOutOfBoundsException.class);		
         Throwables.propagate(e);
      }	
   }

   public double sqrt(double input) throws InvalidInputException{
      if(input < 0) throw new InvalidInputException();
      return Math.sqrt(input);
   }

   public double getValue(int[] list, int index) throws IndexOutOfBoundsException {
      return list[index];
   }

   public void dummyIO() throws IOException {
      throw new IOException();
   }
}

class InvalidInputException extends Exception {
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
InvalidInputException
java.lang.ArrayIndexOutOfBoundsException: 4
	at GuavaTester.getValue(GuavaTester.java:52)
	at GuavaTester.showcaseThrowables1(GuavaTester.java:38)
	at GuavaTester.main(GuavaTester.java:19)
```

# Multiset

Multiset接口扩展设置有重复的元素，并提供了各种实用的方法来处理这样的元素在集合中出现。

## 	接口声明

​	以下是com.google.common.collect.Multiset<E>接口的声明：

```java
@GwtCompatible
public interface Multiset<E>
   extends Collection<E>
```

## 	接口方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **boolean add(E element)**  			添加一个出现的指定元素这个multiset。 |
| 2    | **int add(E element, int occurrences)**  			增加大量的元素到这个multiset。 |
| 3    | **boolean contains(Object element)**  			确定此多集是否包含指定的元素。 |
| 4    | **boolean containsAll(Collection elements)**  			返回true，如果这个多集至少包含一个出现的指定集合中的所有元素。 |
| 5    | **int count(Object element)**  			返回出现的元素的在该multiset的数目（元素的数量）。 |
| 6    | **Set elementSet()**  			返回集包含在此多集不同的元素。 |
| 7    | **Set> entrySet()**  			返回此多集的内容的视图，分组在Multiset.Entry实例中，每一个都提供了多集的一个元素和元素的计数。 |
| 8    | **boolean equals(Object object)**  			比较指定对象与此multiset是否相等。 |
| 9    | **int hashCode()**  			返回此multiset的哈希码。     |
| 10   | **Iterator iterator()**  			返回一个迭代在这个集合中的元素。 |
| 11   | **boolean remove(Object element)**  			移除此多集multiset的单个出现的指定元素，如果存在。 |
| 12   | **int remove(Object element, int occurrences)**  			删除了一些出现，从该多集multiset的指定元素。 |
| 13   | **boolean removeAll(Collection c)**  			删除所有这一切都包含在指定集合（可选操作）在此集合的元素。 |
| 14   | **boolean retainAll(Collection c)**  			保持那些包含在指定collection（可选操作）在此只集合中的元素。 |
| 15   | **int setCount(E element, int count)**  			添加或删除，使得该元素达到所期望的计数的元件的必要出现。 |
| 16   | **boolean setCount(E element, int oldCount, int newCount)**  			有条件设置元素的计数为一个新值，如在setCount（对象，INT）中所述，条件是该元素预期的当前计数。 |
| 17   | **String toString()**  			返回该对象的字符串表示。  |

## 	方法继承

​	此接口继承从以下接口方法：

- ​			java.util.Collection

## 	Multiset 示例

​	使用所选择的编辑器创建下面的java程序，比如说 C:/> Guava

*GuavaTester.java*

```java
import java.util.Iterator;
import java.util.Set;

import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;

public class GuavaTester {

   public static void main(String args[]){
      //create a multiset collection
      Multiset<String> multiset = HashMultiset.create();
      multiset.add("a");
      multiset.add("b");
      multiset.add("c");
      multiset.add("d");
      multiset.add("a");
      multiset.add("b");
      multiset.add("c");
      multiset.add("b");
      multiset.add("b");
      multiset.add("b");
      //print the occurrence of an element
      System.out.println("Occurrence of 'b' : "+multiset.count("b"));
      //print the total size of the multiset
      System.out.println("Total Size : "+multiset.size());
      //get the distinct elements of the multiset as set
      Set<String> set = multiset.elementSet();
      //display the elements of the set
      System.out.println("Set [");
      for (String s : set) {			
         System.out.println(s);		    
      }
      System.out.println("]");
      //display all the elements of the multiset using iterator
      Iterator<String> iterator  = multiset.iterator();
      System.out.println("MultiSet [");
      while(iterator.hasNext()){
         System.out.println(iterator.next());
      }
      System.out.println("]");		
      //display the distinct elements of the multiset with their occurrence count
      System.out.println("MultiSet [");
      for (Multiset.Entry<String> entry : multiset.entrySet())
      {
         System.out.println("Element: "+entry.getElement() +", Occurrence(s): " + entry.getCount());		    
      }
      System.out.println("]");		

      //remove extra occurrences 
      multiset.remove("b",2);
      //print the occurrence of an element
      System.out.println("Occurence of 'b' : "+multiset.count("b"));
   }	
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
Occurence of 'b' : 5
Total Size : 10
Set [
d
b
c
a
]
MultiSet [
d
b
b
b
b
b
c
c
a
a
]
MultiSet [
Element: d, Occurence(s): 1
Element: b, Occurence(s): 5
Element: c, Occurence(s): 2
Element: a, Occurence(s): 2
]
Occurence of 'b' : 3
```

# Bimap

BiMap是一种特殊的映射其保持映射，同时确保没有重复的值是存在于该映射和一个值可以安全地用于获取键背面的倒数映射。

## 	接口声明

​	以下是com.google.common.collect.Bimap<K，V>接口的声明：

```java
@GwtCompatible
public interface BiMap<K,V>
extends Map<K,V>
```

## 	接口方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **V forcePut(K key, V value)**  			另一种put的形式是默默删除，在put(K, V)运行前的任何现有条目值值。 |
| 2    | **BiMap inverse()**  			返回此bimap，每一个bimap的值映射到其相关联的键的逆视图。 |
| 3    | **V put(K key, V value)**  			关联指定值与此映射中(可选操作)指定的键。 |
| 4    | **void putAll(Map map)**  			将所有从指定映射此映射(可选操作)的映射。 |
| 5    | **Set values()**  			返回此映射中包含Collection的值视图。 |

## 	继承的方法

​	这个类继承自以下接口方法：

- ​			java.util.Map

## 	BiMap 示例

​	使用所选择的编辑器创建下面的java程序，比如说 **C:/> Guava**

*GuavaTester.java*

```java
import com.google.common.collect.BiMap;
import com.google.common.collect.HashBiMap;

public class GuavaTester {

   public static void main(String args[]){
      BiMap<Integer, String> empIDNameMap = HashBiMap.create();

      empIDNameMap.put(new Integer(101), "Mahesh");
      empIDNameMap.put(new Integer(102), "Sohan");
      empIDNameMap.put(new Integer(103), "Ramesh");

      //Emp Id of Employee "Mahesh"
      System.out.println(empIDNameMap.inverse().get("Mahesh"));
   }	
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看看以下结果：

```bash
101
```

# Table

Table代表一个特殊的映射，其中两个键可以在组合的方式被指定为单个值。它类似于创建映射的映射。

## 	接口声明

​	以下是 com.google.common.collect.Table<R，C，V> 接口的声明：

```java
@GwtCompatible
public interface Table<R,C,V>
```

## 	接口方法

| S.N. | 方法 & 描述                                                  |
| ---- | ------------------------------------------------------------ |
| 1    | **Set> cellSet()**  			返回集合中的所有行键/列键/值三元组。 |
| 2    | **void clear()**  			从表中删除所有映射。           |
| 3    | **Map column(C columnKey)**  			返回在给定列键的所有映射的视图。 |
| 4    | **Set columnKeySet()**  			返回一组具有表中的一个或多个值的列键。 |
| 5    | **Map> columnMap()**  			返回关联的每一列键与行键对应的映射值的视图。 |
| 6    | **boolean contains(Object rowKey, Object columnKey)**  			返回true，如果表中包含与指定的行和列键的映射。 |
| 7    | **boolean containsColumn(Object columnKey)**  			返回true，如果表中包含与指定列的映射。 |
| 8    | **boolean containsRow(Object rowKey)**  			返回true，如果表中包含与指定的行键的映射关系。 |
| 9    | **boolean containsValue(Object value)**  			返回true，如果表中包含具有指定值的映射。 |
| 10   | **boolean equals(Object obj)**  			比较指定对象与此表是否相等。 |
| 11   | **V get(Object rowKey, Object columnKey)**  			返回对应于给定的行和列键，如果没有这样的映射存在值，返回null。 |
| 12   | **int hashCode()**  			返回此表中的哈希码。         |
| 13   | **boolean isEmpty()**  			返回true，如果表中没有映射。 |
| 14   | **V put(R rowKey, C columnKey, V value)**  			关联指定值与指定键。 |
| 15   | **void putAll(Table table)**  			复制从指定的表中的所有映射到这个表。 |
| 16   | **V remove(Object rowKey, Object columnKey)**  			如果有的话，使用给定键相关联删除的映射。 |
| 17   | **Map row(R rowKey)**  			返回包含给定行键的所有映射的视图。 |
| 18   | **Set rowKeySet()**  			返回一组行键具有在表中的一个或多个值。 |
| 19   | **Map> rowMap()**  			返回关联的每一行按键与键列对应的映射值的视图。 |
| 20   | **int size()**  			返回行键/列键/表中的值映射关系的数量。 |
| 21   | **Collection values()**  			返回所有值，其中可能包含重复的集合。 |

## 	Table 例子

​	选择使用任何编辑器创建以下java程序在 **C:/> Guava**

*GuavaTester.java*

```java
import java.util.Map;
import java.util.Set;

import com.google.common.collect.HashBasedTable;
import com.google.common.collect.Table;

public class GuavaTester {

   public static void main(String args[]){
      //Table<R,C,V> == Map<R,Map<C,V>>
      /*
      *  Company: IBM, Microsoft, TCS
      *  IBM 		-> {101:Mahesh, 102:Ramesh, 103:Suresh}
      *  Microsoft 	-> {101:Sohan, 102:Mohan, 103:Rohan } 
      *  TCS 		-> {101:Ram, 102: Shyam, 103: Sunil } 
      * 
      * */
      //create a table
      Table<String, String, String> employeeTable = HashBasedTable.create();

      //initialize the table with employee details
      employeeTable.put("IBM", "101","Mahesh");
      employeeTable.put("IBM", "102","Ramesh");
      employeeTable.put("IBM", "103","Suresh");

      employeeTable.put("Microsoft", "111","Sohan");
      employeeTable.put("Microsoft", "112","Mohan");
      employeeTable.put("Microsoft", "113","Rohan");

      employeeTable.put("TCS", "121","Ram");
      employeeTable.put("TCS", "122","Shyam");
      employeeTable.put("TCS", "123","Sunil");

      //get Map corresponding to IBM
      Map<String,String> ibmEmployees =  employeeTable.row("IBM");

      System.out.println("List of IBM Employees");
      for(Map.Entry<String, String> entry : ibmEmployees.entrySet()){
         System.out.println("Emp Id: " + entry.getKey() + ", Name: " + entry.getValue());
      }

      //get all the unique keys of the table
      Set<String> employers = employeeTable.rowKeySet();
      System.out.print("Employers: ");
      for(String employer: employers){
         System.out.print(employer + " ");
      }
      System.out.println();

      //get a Map corresponding to 102
      Map<String,String> EmployerMap =  employeeTable.column("102");
      for(Map.Entry<String, String> entry : EmployerMap.entrySet()){
         System.out.println("Employer: " + entry.getKey() + ", Name: " + entry.getValue());
      }		
   }	
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
List of IBM Employees
Emp Id: 102, Name: Ramesh
Emp Id: 101, Name: Mahesh
Emp Id: 103, Name: Suresh
Employers: IBM TCS Microsoft 
Employer: IBM, Name: Ramesh
```

# Cache

Guava通过接口LoadingCache提供了一个非常强大的基于内存的LoadingCache<K，V>。在缓存中自动加载值，它提供了许多实用的方法，在有缓存需求时非常有用。

## 	接口声明

​	以下是forcom.google.common.cache.LoadingCache<K，V>接口的声明：

```java
@Beta
@GwtCompatible
public interface LoadingCache<K,V>
   extends Cache<K,V>, Function<K,V>
```

## 	接口方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **V apply(K key)**  			不推荐使用。提供满足功能接口;使用get(K)或getUnchecked(K)代替。 |
| 2    | **ConcurrentMap asMap()**  			返回存储在该缓存作为一个线程安全的映射条目的视图。 |
| 3    | **V get(K key)**  			返回一个键在这个高速缓存中，首先装载如果需要该值相关联的值。 |
| 4    | **ImmutableMap getAll(Iterable keys)**  			返回一个键相关联的值的映射，创建或必要时检索这些值。 |
| 5    | **V getUnchecked(K key)**  			返回一个键在这个高速缓存中，首先装载如果需要该值相关联的值。 |
| 6    | **void refresh(K key)**  			加载键key，可能是异步的一个新值。 |

## 	LoadingCache 示例

​	使用所选择的编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

import com.google.common.base.MoreObjects;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;

public class GuavaTester {
   public static void main(String args[]){
      //create a cache for employees based on their employee id
      LoadingCache employeeCache = 
         CacheBuilder.newBuilder()
            .maximumSize(100) // maximum 100 records can be cached
            .expireAfterAccess(30, TimeUnit.MINUTES) // cache will expire after 30 minutes of access
            .build(new CacheLoader(){ // build the cacheloader
               @Override
               public Employee load(String empId) throws Exception {
                  //make the expensive call
                  return getFromDatabase(empId);
               }							
            });

      try {			
         //on first invocation, cache will be populated with corresponding
         //employee record
         System.out.println("Invocation #1");
         System.out.println(employeeCache.get("100"));
         System.out.println(employeeCache.get("103"));
         System.out.println(employeeCache.get("110"));
         //second invocation, data will be returned from cache
         System.out.println("Invocation #2");
         System.out.println(employeeCache.get("100"));
         System.out.println(employeeCache.get("103"));
         System.out.println(employeeCache.get("110"));

      } catch (ExecutionException e) {
         e.printStackTrace();
      }
   }

   private static Employee getFromDatabase(String empId){
      Employee e1 = new Employee("Mahesh", "Finance", "100");
      Employee e2 = new Employee("Rohan", "IT", "103");
      Employee e3 = new Employee("Sohan", "Admin", "110");

      Map database = new HashMap();
      database.put("100", e1);
      database.put("103", e2);
      database.put("110", e3);
      System.out.println("Database hit for" + empId);
      return database.get(empId);		
   }
}

class Employee {
   String name;
   String dept;
   String emplD;

   public Employee(String name, String dept, String empID){
      this.name = name;
      this.dept = dept;
      this.emplD = empID;
   }
   public String getName() {
      return name;
   }
   public void setName(String name) {
      this.name = name;
   }
   public String getDept() {
      return dept;
   }
   public void setDept(String dept) {
      this.dept = dept;
   }
   public String getEmplD() {
      return emplD;
   }
   public void setEmplD(String emplD) {
      this.emplD = emplD;
   }

   @Override
   public String toString() {
      return MoreObjects.toStringHelper(Employee.class)
      .add("Name", name)
      .add("Department", dept)
      .add("Emp Id", emplD).toString();
   }	
}
```

## 	验证结果

​	使用javac编译器如下编译类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看看结果：

```bash
Invocation #1
Database hit for100
Employee{Name=Mahesh, Department=Finance, Emp Id=100}
Database hit for103
Employee{Name=Rohan, Department=IT, Emp Id=103}
Database hit for110
Employee{Name=Sohan, Department=Admin, Emp Id=110}
Invocation #2
Employee{Name=Mahesh, Department=Finance, Emp Id=100}
Employee{Name=Rohan, Department=IT, Emp Id=103}
Employee{Name=Sohan, Department=Admin, Emp Id=110}
```

# Joiner

Joiner 提供了各种方法来处理字符串加入操作，对象等。

## 	类声明

​	以下是com.google.common.base.Joiner类的声明：

```java
@GwtCompatible
public class Joiner
   extends Object
```

## 	类方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **A appendTo(A appendable, Iterable parts)**  			每个追加部分的字符串表示，使用每个之间先前配置的分离器，可用来追加。 |
| 2    | **A appendTo(A appendable, Iterator parts)**  			每个追加部分的字符串表示，使用每个之间先前配置的分离器，可用来追加。 |
| 3    | **A appendTo(A appendable, Object[] parts)**  			每个追加部分的字符串表示，使用每个之间先前配置的分离器，可用来追加。 |
| 4    | **A appendTo(A appendable, Object first, Object second, Object... rest)**  			追加到可追加的每个其余参数的字符串表示。 |
| 5    | **StringBuilder appendTo(StringBuilder builder, Iterable parts)**  			每个追加部分的字符串表示，使用每个之间先前配置的分离器，为构建者。 |
| 6    | **StringBuilder appendTo(StringBuilder builder, Iterator parts)**  			每个追加部分的字符串表示，使用每个之间先前配置的分离器，为构建者。 |
| 7    | **StringBuilder appendTo(StringBuilder builder, Object[] parts)**  			每个追加部分的字符串表示，使用每个之间先前配置的分离器，为构建者。 |
| 8    | **StringBuilder appendTo(StringBuilder builder, Object first, Object second, Object... rest)**  			追加到构建器的每个其余参数的字符串表示。 |
| 9    | **String join(Iterable parts)**  			返回一个包含每个部分的字符串表示，使用每个之间先前配置的分隔符的字符串。 |
| 10   | **String join(Iterator parts)**  			返回一个包含每个部分的字符串表示，使用每个之间先前配置的分隔符的字符串。 |
| 11   | **String join(Object[] parts)**  			返回一个包含每个部分的字符串表示，使用每个之间先前配置的分隔符的字符串。 |
| 12   | **String join(Object first, Object second, Object... rest)**  			返回一个包含每个参数的字符串表示，使用每个之间先前配置的分隔符的字符串。 |
| 13   | **static Joiner on(char separator)**  			返回一个加入者其连续元素之间自动地分隔符。 |
| 14   | **static Joiner on(String separator)**  			返回一个加入者其连续元素之间自动地分隔符。 |
| 15   | **Joiner skipNulls()**  			返回一个相同的行为，因为这加入者，除了自动跳过任何提供空元素的加入者。 |
| 16   | **Joiner useForNull(String nullText)**  			返回一个相同的行为，因为这一个加入者，除了自动替换nullText任何提供null元素。 |
| 17   | **Joiner.MapJoiner withKeyValueSeparator(String keyValueSeparator)**  			返回使用给定键值分离器MapJoiner，和相同的结构，否则为Joiner连接符 。 |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Joiner 示例

​	使用所选择的编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import java.util.Arrays;
import com.google.common.base.Joiner;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testJoiner();	
   }

   private void testJoiner(){
      System.out.println(Joiner.on(",")
         .skipNulls()
         .join(Arrays.asList(1,2,3,4,5,null,6)));
   }
}
```

## 	验证输出结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看看结果：

```bash
1,2,3,4,5,6
```

# Spiltter

Splitter 提供了各种方法来处理分割操作字符串，对象等。

## 	类声明

​	以下是com.google.common.base.Splitter类的声明：

```java
@GwtCompatible(emulated=true)
public final class Splitter
   extends Object
```

## 	类方法

| S.N. | 方法及说明                                                   |
| :--- | :----------------------------------------------------------- |
| 1    | **static Splitter fixedLength(int length)**  			返回分离器的划分字符串到给定长度的片段。 |
| 2    | **Splitter limit(int limit)**  			返回一个分离器，其行为等同于这个分离器，但停止分裂后达到了极限。 |
| 3    | **Splitter omitEmptyStrings()**  			返回使用给定的单字符分离器分离器。 |
| 4    | **static Splitter on(char separator)**  			返回使用给定的单字符分离器分离器。 |
| 5    | **static Splitter on(CharMatcher separatorMatcher)**  			返回一个分离器的匹配考虑由给定CharMatcher是一个分隔任何单个字符。 |
| 6    | **static Splitter on(Pattern separatorPattern)**  			返回分离器的考虑任何序列匹配模式是一个分隔符。 |
| 7    | **static Splitter on(String separator)**  			返回使用给定的固定的字符串作为分隔符分离器。 |
| 8    | **static Splitter onPattern(String separatorPattern)**  			返回分离器的考虑任何序列匹配一个给定模式(正则表达式)是一个分隔符。 |
| 9    | **Iterable split(CharSequence sequence)**  			分割成序列串组件并使其可通过迭代器，其可以被懒惰地评估计算。 |
| 10   | **List splitToList(CharSequence sequence)**  			拆分序列化为字符串组成部分，并将其返回为不可变列表。 |
| 11   | **Splitter trimResults()**  			返回分离器的行为等同于该分离器，但会自动删除开头和结尾的空白，从每个返回子;相当于trimResults(CharMatcher.WHITESPACE). |
| 12   | **Splitter trimResults(CharMatcher trimmer)**  			返回分离器的行为等同于该分离器，但会删除所有开头或结尾的字符匹配每一个给定的CharMatcher返回字符串。 |
| 13   | **Splitter.MapSplitter withKeyValueSeparator(char separator)**  			返回MapSplitter这样会将在此基础上分离器的条目，并分割成入口键和值使用指定的分隔符。 |
| 14   | **Splitter.MapSplitter withKeyValueSeparator(Splitter keyValueSplitter)**  			返回MapSplitter这样会将在此基础上分离器的条目，并分割成条目使用指定的键值分离器键和值。 |
| 15   | **Splitter.MapSplitter withKeyValueSeparator(String separator)**  			返回MapSplitter这样会将在此基础上分离器的条目，并分割成入口键和值使用指定的分隔符。 |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Splitter 例子

​	使用所选择的编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import com.google.common.base.Splitter;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testSplitter();
   }

   private void testSplitter(){
      System.out.println(Splitter.on(',')
         .trimResults()
         .omitEmptyStrings()
         .split("the ,quick, , brown         , fox,              jumps, over, the, lazy, little dog."));
   }
}
```

## 	验证输出

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
[the, quick, brown, fox, jumps, over, the, lazy, little dog.]
```

# CharMatcher

CharMatcher提供了各种方法来处理各种JAVA char类型值。

## 	类声明

​	以下是com.google.common.base.CharMatcher类的声明：

```java
@GwtCompatible(emulated=true)
public final class CharMatcher
   extends Object
```

## 	字体

| S.N. | 字段及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static CharMatcher ANY**  			匹配任意字符。       |
| 2    | **static CharMatcher ASCII**  			确定字符是否为ASCII码，这意味着它的代码点低于128。 |
| 3    | **static CharMatcher BREAKING_WHITESPACE**  			确定一个字符是否是一个破空白（即，一个空格可以解释为格式目的词之间休息）。 |
| 4    | **static CharMatcher DIGIT**  			确定一个字符是否是根据Unicode数字。 |
| 5    | **static CharMatcher INVISIBLE**  			确定一个字符是否是看不见的;也就是说，如果它的Unicode类是任何SPACE_SEPARATOR，LINE_SEPARATOR，PARAGRAPH_SEPARATOR，控制，FORMAT，SURROGATE和PRIVATE_USE根据ICU4J。 |
| 6    | **static CharMatcher JAVA_DIGIT**  			确定一个字符是否是按照Java的定义一个数字。 |
| 7    | **static CharMatcher JAVA_ISO_CONTROL**  			确定一个字符是否是所指定的Character.isISOControl(char)ISO控制字符。 |
| 8    | **static CharMatcher JAVA_LETTER**  			确定一个字符是否是按照Java的定义的字母。 |
| 9    | **static CharMatcher JAVA_LETTER_OR_DIGIT**  			确定一个字符是否是按照Java的定义，一个字母或数字。 |
| 10   | **static CharMatcher JAVA_LOWER_CASE**  			确定一个字符是否是按照Java定义的小写。 |
| 11   | **static CharMatcher JAVA_UPPER_CASE**  			确定一个字符是否是按照Java定义的大写。 |
| 12   | **static CharMatcher NONE**  			匹配任何字符。      |
| 13   | **static CharMatcher SINGLE_WIDTH**  			确定一个字符是否是单宽度（不是双倍宽度）。 |
| 14   | **static CharMatcher WHITESPACE**  			决定根据最新的Unicode标准是否字符是空白，如图所示这里。 |

## 	构造函数

| S.N. | 构造函数 & 描述                                              |
| ---- | ------------------------------------------------------------ |
| 1    | **protected CharMatcher()**  			构造方法，供子类使用。 |

## 	类方法

| S.N. | 方法 & 描述                                                  |
| ---- | ------------------------------------------------------------ |
| 1    | **CharMatcher and(CharMatcher other)**  			返回一个匹配器，匹配两种匹配器和其他任何字符。 |
| 2    | **static CharMatcher anyOf(CharSequence sequence)**  			返回一个字符匹配匹配任何字符出现在给定的字符序列。 |
| 3    | **boolean apply(Character character)**  			不推荐使用。只有提供满足谓词接口;用匹配（字符）代替。 |
| 4    | **String collapseFrom(CharSequence sequence, char replacement)**  			返回输入字符序列的字符串拷贝，每个组连续的字符匹配此匹配由单一的替换字符替换。 |
| 5    | **int countIn(CharSequence sequence)**  			返回一个字符序列中发现匹配的字符的数目。 |
| 6    | **static CharMatcher forPredicate(Predicate predicate)**  			返回与相同的行为给定的基于字符的谓词匹配，但运行在原始的字符，而不是实例。 |
| 7    | **int indexIn(CharSequence sequence)**  			返回第一个匹配字符的索引中的一个字符序列，或-1，如果没有匹配的字符存在。 |
| 8    | **int indexIn(CharSequence sequence, int start)**  			返回第一个匹配字符的索引中的一个字符序列，从给定位置开始，或-1，如果没有字符的位置之后匹配。 |
| 9    | **static CharMatcher inRange(char startInclusive, char endInclusive)**  			返回一个字符匹配匹配给定范围内的任何字符（两个端点也包括在内）。 |
| 10   | **static CharMatcher is(char match)**  			返回一个字符匹配匹配只有一个指定的字符。 |
| 11   | **static CharMatcher isNot(char match)**  			返回一个字符匹配匹配除了指定的任何字符。 |
| 12   | **int lastIndexIn(CharSequence sequence)**  			返回最后一个匹配字符的索引中的字符序列，或-1，如果没有匹配的字符存在。 |
| 13   | **abstract boolean matches(char c)**  			确定给定字符一个true或false值。 |
| 14   | **boolean matchesAllOf(CharSequence sequence)**  			确定给定字符一个true或false值。 |
| 15   | **boolean matchesAnyOf(CharSequence sequence)**  			返回true如果字符序列包含至少一个匹配的字符。 |
| 16   | **boolean matchesNoneOf(CharSequence sequence)**  			返回true，如果一个字符序列中没有匹配的字符。 |
| 17   | **CharMatcher negate()**  			返回一个匹配器，不受此匹配匹配任何字符。 |
| 18   | **static CharMatcher noneOf(CharSequence sequence)**  			返回一个字符匹配器匹配不存在于给定的字符序列的任何字符。 |
| 19   | **CharMatcher or(CharMatcher other)**  			返回一个匹配器，匹配任何匹配或其他任何字符。 |
| 20   | **CharMatcher precomputed()**  			返回一个字符匹配功能上等同于这一个，但它可能会快于原来的查询;您的里程可能会有所不同。 |
| 21   | **String removeFrom(CharSequence sequence)**  			返回包含的字符序列的所有非匹配的字符，为了一个字符串。 |
| 22   | **String replaceFrom(CharSequence sequence, char replacement)**  			返回输入字符序列的字符串副本，其中每个字符匹配该匹配器由一个给定的替换字符替换。 |
| 23   | **String replaceFrom(CharSequence sequence, CharSequence replacement)**  			返回输入字符序列的字符串副本，其中每个字符匹配该匹配器由一个给定的替换序列替换。 |
| 24   | **String retainFrom(CharSequence sequence)**  			返回包含的字符序列的所有字符匹配，为了一个字符串。 |
| 25   | **String toString()**  			返回此CharMatcher，如CharMatcher.or（WHITESPACE，JAVA_DIGIT）的字符串表示。 |
| 26   | **String trimAndCollapseFrom(CharSequence sequence, char replacement)**  			折叠匹配字符完全一样collapseFrom一组如collapseFrom(java.lang.CharSequence, char) 做的一样，不同之处在于，无需更换一组被移除的匹配字符在开始或该序列的结束。 |
| 27   | **String trimFrom(CharSequence sequence)**  			返回输入字符序列省略了所有匹配器从一开始，并从该串的末尾匹配字符的字符串。 |
| 28   | **String trimLeadingFrom(CharSequence sequence)**  			返回输入字符序列，它省略了所有这些匹配的字符串开始处匹配字符的字符串。 |
| 29   | **String trimTrailingFrom(CharSequence sequence)**  			返回输入字符序列，它省略了所有这些匹配的字符串的结尾匹配字符的字符串。 |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	CharMatcher 例子

​	使用所选择的编辑器创建下面的java程序 C:/> Guava

*GuavaTester.java*

```java
import com.google.common.base.CharMatcher;
import com.google.common.base.Splitter;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testCharMatcher();
   }

   private void testCharMatcher(){
      System.out.println(CharMatcher.DIGIT.retainFrom("mahesh123")); // only the digits
      System.out.println(CharMatcher.WHITESPACE.trimAndCollapseFrom("     Mahesh     Parashar ", ' '));
      // trim whitespace at ends, and replace/collapse whitespace into single spaces
      System.out.println(CharMatcher.JAVA_DIGIT.replaceFrom("mahesh123", "*")); // star out all digits
      System.out.println(CharMatcher.JAVA_DIGIT.or(CharMatcher.JAVA_LOWER_CASE).retainFrom("mahesh123"));
      // eliminate all characters that aren't digits or lowercase
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看看结果

```bash
123
Mahesh Parashar
mahesh***
mahesh123
```

# CaseFormat

CaseFormat是一种实用工具类，以提供不同的ASCII字符格式之间的转换。

## 	类声明

​	以下是com.google.common.base.CaseFormat类的声明：

```java
@GwtCompatible
public enum CaseFormat
   extends Enum<CaseFormat>
```

## 	枚举常量

| S.N. | 枚举常量和说明                                               |
| ---- | ------------------------------------------------------------ |
| 1    | **LOWER_CAMEL**  			Java变量的命名规则，如“lowerCamel”。 |
| 2    | **LOWER_HYPHEN**  			连字符连接变量的命名规则，如“lower-hyphen”。 |
| 3    | **LOWER_UNDERSCORE**  			C ++变量命名规则，如“lower_underscore”。 |
| 4    | **UPPER_CAMEL**  			Java和C++类的命名规则，如“UpperCamel”。 |
| 5    | **UPPER_UNDERSCORE**  			Java和C++常量的命名规则，如“UPPER_UNDERSCORE”。 |

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **Converter converterTo(CaseFormat targetFormat)**  			返回一个转换，从这个格式转换targetFormat字符串。 |
| 2    | **String to(CaseFormat format, String str)**  			从这一格式指定格式的指定字符串 str 转换。 |
| 3    | **static CaseFormat valueOf(String name)**  			返回此类型具有指定名称的枚举常量。 |
| 4    | **static CaseFormat[] values()**  			返回一个包含该枚举类型的常量数组中的顺序被声明。 |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Enum
- ​			java.lang.Object

## 	CaseFormat 示例

​	使用所选择的编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import com.google.common.base.CaseFormat;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testCaseFormat();
   }

   private void testCaseFormat(){
      String data = "test_data";
      System.out.println(CaseFormat.LOWER_HYPHEN.to(CaseFormat.LOWER_CAMEL, "test-data"));
      System.out.println(CaseFormat.LOWER_UNDERSCORE.to(CaseFormat.LOWER_CAMEL, "test_data"));
      System.out.println(CaseFormat.UPPER_UNDERSCORE.to(CaseFormat.UPPER_CAMEL, "test_data"));
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
testData
testData
TestData
```

# Bytes

Bytes是byte的基本类型实用工具类。

## 	类声明

​	以下是com.google.common.primitives.Bytes类的声明：

```java
@GwtCompatible
public final class Bytes
   extends Object
```

## 	方法：

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static List asList(byte... backingArray)**  			返回由指定数组支持的固定大小的列表，类似 Arrays.asList(Object[]). |
| 2    | **static byte[] concat(byte[]... arrays)**  			则返回来自每个阵列提供组合成一个单一的阵列值。 |
| 3    | **static boolean contains(byte[] array, byte target)**  			返回true，如果目标是否存在在任何地方数组元素。 |
| 4    | **static byte[] ensureCapacity(byte[] array, int minLength, int padding)**  			返回一个包含相同的值数组的数组，但保证是一个规定的最小长度。 |
| 5    | **static int hashCode(byte value)**  			返回哈希码的值;等于调用的结果 ((Byte) value).hashCode(). |
| 6    | **static int indexOf(byte[] array, byte target)**  			返回目标数组的首次出现的索引值。 |
| 7    | **static int indexOf(byte[] array, byte[] target)**  			返回指定目标的第一个匹配的起始位置数组内，或-1如果不存在。 |
| 8    | **static int lastIndexOf(byte[] array, byte target)**  			返回目标在数组中最后一个出场的索引的值。 |
| 9    | **static byte[] toArray(Collection collection)**  			返回包含集合的每个值的数组，转换为字节值中的方式Number.byteValue(). |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Bytes 示例

​	使用所选择的编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import java.util.List;
import com.google.common.primitives.Bytes;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testBytes();
   }

   private void testBytes(){
      byte[] byteArray = {1,2,3,4,5,5,7,9,9};

      //convert array of primitives to array of objects
      List<Byte> objectArray = Bytes.asList(byteArray);
      System.out.println(objectArray.toString());

      //convert array of objects to array of primitives
      byteArray = Bytes.toArray(objectArray);
      System.out.print("[ ");
      for(int i = 0; i< byteArray.length ; i++){
         System.out.print(byteArray[i] + " ");
      }
      System.out.println("]");
      byte data = 5;
      //check if element is present in the list of primitives or not
      System.out.println("5 is in list? "+ Bytes.contains(byteArray, data));

      //Returns the index		
      System.out.println("Index of 5: " + Bytes.indexOf(byteArray,data));

      //Returns the last index maximum		
      System.out.println("Last index of 5: " + Bytes.lastIndexOf(byteArray,data));				
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
[1, 2, 3, 4, 5, 5, 7, 9, 9]
[ 1 2 3 4 5 5 7 9 9 ]
5 is in list? true
Index of 5: 4
Last index of 5: 5
```

# Shorts

Shorts是基本类型short的实用工具类。

## 	类声明

​	以下是com.google.common.primitives.Shorts类的声明：

```java
@GwtCompatible
public final class Shorts
   extends Object
```

## 	字段

| S.N. | 字段及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static int BYTES**  			所需要的字节数来表示一个原始short的值。 |
| 2    | **static short MAX_POWER_OF_TWO**  			两个最大的幂可以被表示为short。 |

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static List asList(short... backingArray)**  			返回由指定数组支持的固定大小的列表，类似 Arrays.asList(Object[]). |
| 2    | **static short checkedCast(long value)**  			返回 short 值，该值等于value，如果可能的话。 |
| 3    | **static int compare(short a, short b)**  			比较两个指定的short值。 |
| 4    | **static short[] concat(short[]... arrays)**  			每个阵列提供组合成一个单一的阵列，则返回其值。 |
| 5    | **static boolean contains(short[] array, short target)**  			返回true，如果目标是否存在在任何地方数组元素。 |
| 6    | **static short[] ensureCapacity(short[] array, int minLength, int padding)**  			返回一个包含相同的值数组的数组，但保证是一个规定的最小长度。 |
| 7    | **static short fromByteArray(byte[] bytes)**  			返回短值，其大端表示被存储在最前2字节的字节;相当于 ByteBuffer.wrap(bytes).getShort(). |
| 8    | **static short fromBytes(byte b1, byte b2)**  			返回short值的字节表示的是给定2个字节，以 big-endian 顺序; 相当于 Shorts.fromByteArray(new byte[] {b1, b2}). |
| 9    | **static int hashCode(short value)**  			返回值的哈希码;等于调用的结果 ((Short) value).hashCode(). |
| 10   | **static int indexOf(short[] array, short target)**  			返回值目标数组的首次出现的索引。 |
| 11   | **static int indexOf(short[] array, short[] target)**  			返回指定目标的第一个匹配的起始位置数组或-1，如果不存在这样的发生。 |
| 12   | **static String join(String separator, short... array)**  			返回包含由分离器分离所提供的短值的字符串。 |
| 13   | **static int lastIndexOf(short[] array, short target)**  			返回目标在数组中最后一个出现的索引的值。 |
| 14   | **static Comparator lexicographicalComparator()**  			返回一个比较，比较两个 short 阵列字典顺序。 |
| 15   | **static short max(short... array)**  			返回出现在数组中的最大值。 |
| 16   | **static short min(short... array)**  			返回出现在数组的最小值。 |
| 17   | **static short saturatedCast(long value)**  			返回short最接近int的值。 |
| 18   | **static Converter stringConverter()**  			返回使用字符串和shorts之间的一个转换器序列化对象 Short.decode(java.lang.String) and Short.toString(). |
| 19   | **static short[] toArray(Collection collection)**  			返回包含集合的每个值的数组，转换为 short 值的方式Number.shortValue(). |
| 20   | **static byte[] toByteArray(short value)**  			返回在2元素的字节数组值大尾数法表示;相当于 ByteBuffer.allocate(2).putShort(value).array(). |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Shorts 示例

​	使用所选择的编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import java.util.List;

import com.google.common.primitives.Shorts;

public class GuavaTester {

   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testShorts();
   }

   private void testShorts(){
      short[] shortArray = {1,2,3,4,5,6,7,8,9};

      //convert array of primitives to array of objects
      List<Short> objectArray = Shorts.asList(shortArray);
      System.out.println(objectArray.toString());

      //convert array of objects to array of primitives
      shortArray = Shorts.toArray(objectArray);
      System.out.print("[ ");
      for(int i = 0; i< shortArray.length ; i++){
         System.out.print(shortArray[i] + " ");
      }
      System.out.println("]");
      short data = 5;
      //check if element is present in the list of primitives or not
      System.out.println("5 is in list? "+ Shorts.contains(shortArray, data));

      //Returns the minimum		
      System.out.println("Min: " + Shorts.min(shortArray));

      //Returns the maximum		
      System.out.println("Max: " + Shorts.max(shortArray));
      data = 2400;
      //get the byte array from an integer
      byte[] byteArray = Shorts.toByteArray(data);
      for(int i = 0; i< byteArray.length ; i++){
         System.out.print(byteArray[i] + " ");
      }
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
[1, 2, 3, 4, 5, 6, 7, 8, 9]
[ 1 2 3 4 5 6 7 8 9 ]
5 is in list? true
Min: 1
Max: 9
9 96 
```

# Ints

整数Ints是原始的int类型的实用工具类。

## 	类声明

​	以下是com.google.common.primitives.Ints类的声明：

```java
@GwtCompatible
public final class Ints
   extends Object
```

## 	字段

| S.N. | 字段及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static int BYTES**  			所需要的字节数来表示一个原始int值。 |
| 2    | **static int MAX_POWER_OF_TWO**  			两个最大的幂可以被表示为整数。 |

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static List asList(int... backingArray)**  			返回由指定数组支持的固定大小的列表，类似Arrays.asList(Object[]). |
| 2    | **static int checkedCast(long value)**  			返回int值等于值，如果可能的话。 |
| 3    | **static int compare(int a, int b)**  			比较两个指定的int值。 |
| 4    | **static int[] concat(int[]... arrays)**  			每个阵列提供组合成一个单一的阵列，则返回值。 |
| 5    | **static boolean contains(int[] array, int target)**  			返回true，如果target是否存在在任何地方数组元素。 |
| 6    | **static int[] ensureCapacity(int[] array, int minLength, int padding)**  			返回一个包含相同的值数组的数组，但保证是一个规定的最小长度。 |
| 7    | **static int fromByteArray(byte[] bytes)**  			返回int值，其大端表示存储在第一个4字节的字节;相当于ByteBuffer.wrap(bytes).getInt(). |
| 8    | **static int fromBytes(byte b1, byte b2, byte b3, byte b4)**  			返回int值的字节表示的是给定的4个字节，在big-endian的顺序;相当于 Ints.fromByteArray(new byte[] {b1, b2, b3, b4}). |
| 9    | **static int hashCode(int value)**  			返回值的哈希码; 等于调用 ((Integer) value).hashCode() 的结果 |
| 10   | **static int indexOf(int[] array, int target)**  			返回值目标数组的第一次亮相的索引。 |
| 11   | **static int indexOf(int[] array, int[] target)**  			返回指定目标的第一个匹配的起始位置数组内，或-1，如果不存在。 |
| 12   | **static String join(String separator, int... array)**  			返回包含由分离器分离所提供的整型值的字符串。 |
| 13   | **static int lastIndexOf(int[] array, int target)**  			返回target 在数组中最后一个出场的索引值。 |
| 14   | **static Comparator lexicographicalComparator()**  			返回一个比较，比较两个int数组字典顺序。 |
| 15   | **static int max(int... array)**  			返回出现在数组中的最大值。 |
| 16   | **static int min(int... array)**  			返回最小值出现在数组。 |
| 17   | **static int saturatedCast(long value)**  			返回最接近的int值。 |
| 18   | **static Converter stringConverter()**  			返回使用字符串和整数之间的一个转换器序列化对象 Integer.decode(java.lang.String) 和 Integer.toString(). |
| 19   | **static int[] toArray(Collection collection)**  			返回包含集合的每个值的数组，转换为int值的方式Number.intValue(). |
| 20   | **static byte[] toByteArray(int value)**  			返回一个4元素的字节数组值大端表示;相当于 ByteBuffer.allocate(4).putInt(value).array(). |
| 21   | **static Integer tryParse(String string)**  			解析指定的字符串作为符号十进制整数。 |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Ints 示例

​	使用所选择的任何编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import java.util.List;

import com.google.common.primitives.Ints;

public class GuavaTester {

   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testInts();
   }

   private void testInts(){
      int[] intArray = {1,2,3,4,5,6,7,8,9};

      //convert array of primitives to array of objects
      List<Integer> objectArray = Ints.asList(intArray);
      System.out.println(objectArray.toString());

      //convert array of objects to array of primitives
      intArray = Ints.toArray(objectArray);
      System.out.print("[ ");
      for(int i = 0; i< intArray.length ; i++){
         System.out.print(intArray[i] + " ");
      }
      System.out.println("]");
      //check if element is present in the list of primitives or not
      System.out.println("5 is in list? "+ Ints.contains(intArray, 5));

      //Returns the minimum		
      System.out.println("Min: " + Ints.min(intArray));

      //Returns the maximum		
      System.out.println("Max: " + Ints.max(intArray));

      //get the byte array from an integer
      byte[] byteArray = Ints.toByteArray(20000);
      for(int i = 0; i< byteArray.length ; i++){
         System.out.print(byteArray[i] + " ");
      }
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
[1, 2, 3, 4, 5, 6, 7, 8, 9]
[ 1 2 3 4 5 6 7 8 9 ]
5 is in list? true
Min: 1
Max: 9
0 0 78 32 
```

# Longs

Longs是基本类型long的实用工具类。

## 	类声明

​	以下是com.google.common.primitives.Longs类的声明：

```java
@GwtCompatible
public final class Longs
   extends Object
```

## 	字段

| S.N. | 字段及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static int BYTES**  			所需要的字节数来表示一个原始long 值。 |
| 2    | **static long MAX_POWER_OF_TWO**  			两个最大幂可以被表示为一个long。 |

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static List asList(long... backingArray)**  			返回由指定数组支持的固定大小的列表，类似Arrays.asList(Object[]). |
| 2    | **static int compare(long a, long b)**  			比较两个指定数的long值。 |
| 3    | **static long[] concat(long[]... arrays)**  			每个数组提供组合成一个单一的数组，则返回值。 |
| 4    | **static boolean contains(long[] array, long target)**  			返回true，如果target是否存在在任何地方数组元素。 |
| 5    | **static long[] ensureCapacity(long[] array, int minLength, int padding)**  			返回一个包含相同的值数组的数组，但保证是一个规定的最小长度。 |
| 6    | **static long fromByteArray(byte[] bytes)**  			返回long值，其大端表示存储在头8个字节的字节;相当于ByteBuffer.wrap(bytes).getLong(). |
| 7    | **static long fromBytes(byte b1, byte b2, byte b3, byte b4, byte b5, byte b6, byte b7, byte b8)**  			返回long值，字节表示的是给定的8个字节，在big-endian的顺序;相当于 Longs.fromByteArray(new byte[] {b1, b2, b3, b4, b5, b6, b7, b8}). |
| 8    | **static int hashCode(long value)**  			返回哈希码的值;等于调用 ((Long) value).hashCode() 的结果 |
| 9    | **static int indexOf(long[] array, long target)**  			返回目标数组的首次出现的索引值。 |
| 10   | **static int indexOf(long[] array, long[] target)**  			返回指定目标的第一个匹配的起始位置数组内，或-1，如果不存在。 |
| 11   | **static String join(String separator, long... array)**  			返回包含由分离器分离所提供long 的字符串值。 |
| 12   | **static int lastIndexOf(long[] array, long target)**  			返回target 在数组中最后一个出场的索引值。 |
| 13   | **static Comparator lexicographicalComparator()**  			返回一个比较，比较两个long数组字典顺序。 |
| 14   | **static long max(long... array)**  			返回出现在数组中的最大值。 |
| 15   | **static long min(long... array)**  			返回最小值出现在数组。 |
| 16   | **static Converter stringConverter()**  			返回使用字符串和长整型之间的转换可序列化器对象Long.decode(java.lang.String) 和 Long.toString(). |
| 17   | **static long[] toArray(Collection collection)**  			返回包含集合的每个值的数组，转换为一个long值的方式Number.longValue(). |
| 18   | **static byte[] toByteArray(long value)**  			返回字节数组值大端在8元素的表示;相当于 ByteBuffer.allocate(8).putLong(value).array(). |
| 19   | **static Long tryParse(String string)**  			Parses the specified string as a signed decimal long value. |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Longs 示例

​	使用所选择的任何编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import java.util.List;

import com.google.common.primitives.Ints;
import com.google.common.primitives.Longs;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testLongs();
   }

   private void testLongs(){
      long[] longArray = {1,2,3,4,5,6,7,8,9};

      //convert array of primitives to array of objects
      List<Long> objectArray = Longs.asList(longArray);
      System.out.println(objectArray.toString());

      //convert array of objects to array of primitives
      longArray = Longs.toArray(objectArray);
      System.out.print("[ ");
      for(int i = 0; i< longArray.length ; i++){
         System.out.print(longArray[i] + " ");
      }
      System.out.println("]");
      //check if element is present in the list of primitives or not
      System.out.println("5 is in list? "+ Longs.contains(longArray, 5));

      //Returns the minimum		
      System.out.println("Min: " + Longs.min(longArray));

      //Returns the maximum		
      System.out.println("Max: " + Longs.max(longArray));

      //get the byte array from an integer
      byte[] byteArray = Longs.toByteArray(20000);
      for(int i = 0; i< byteArray.length ; i++){
         System.out.print(byteArray[i] + " ");
      }
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```
C:\Guava>java GuavaTester
```

​	看到结果。

```
[1, 2, 3, 4, 5, 6, 7, 8, 9]
[ 1 2 3 4 5 6 7 8 9 ]
5 is in list? true
Min: 1
Max: 9
0 0 0 0 0 0 78 32 
```

# Floats

Floats是float基本类型的实用工具类。

## 	类声明

​	以下是com.google.common.primitives.Floats类的声明：

```java
@GwtCompatible(emulated=true)
   public final class Floats
      extends Object
```

## 	字体

| S.N. | 字段及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static int BYTES**  			所需要的字节数来表示一个原始浮点值。 |

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static List asList(float... backingArray)**  			返回由指定数组支持的固定大小的列表，类似 Arrays.asList(Object[]). |
| 2    | **static int compare(float a, float b)**  			通过比较两个指定的浮点值 Float.compare(float, float). |
| 3    | **static float[] concat(float[]... arrays)**  			每个数组提供组合成一个单一的数组，则返回值。 |
| 4    | **static boolean contains(float[] array, float target)**  			返回true，如果target是否存在在任何地方数组元素。 |
| 5    | **static float[] ensureCapacity(float[] array, int minLength, int padding)**  			返回一个包含相同的值数组的数组，但保证是一个规定的最小长度。 |
| 6    | **static int hashCode(float value)**  			返回哈希码的值;等于调用的结果 ((Float) value).hashCode(). |
| 7    | **static int indexOf(float[] array, float target)**  			返回目标数组的首次出现的索引值。 |
| 8    | **static int indexOf(float[] array, float[] target)**  			返回指定目标的第一个匹配的起始位置数组内，或-1，如果不存在。 |
| 9    | **static boolean isFinite(float value)**  			返回true，如果值代表一个实数。 |
| 10   | **static String join(String separator, float... array)**  			返回包含所提供的浮点值，所指定的Float.toString(float)，并通过分离器分离转换为字符串的字符串。 |
| 11   | **static int lastIndexOf(float[] array, float target)**  			返回target 在数组中最后一个出场的索引值。 |
| 12   | **static Comparator lexicographicalComparator()**  			返回一个比较，比较两个浮点阵列字典顺序。 |
| 13   | **static float max(float... array)**  			返回存在于数组的最大值，使用比较为相同的规则 Math.min(float, float). |
| 14   | **static float min(float... array)**  			返回存在于数组的最小值，使用比较为相同的规则 Math.min(float, float). |
| 15   | **static Converter stringConverter()**  			返回使用字符串和浮点数之间的一个转换器序列化对象 Float.valueOf(java.lang.String) 和 Float.toString(). |
| 16   | **static float[] toArray(Collection collection)**  			返回一个包含集合中的每个值的数组，转换为浮点值的方式Number.floatValue(). |
| 17   | **static Float tryParse(String string)**  			解析指定的字符串作为单精度浮点值。 |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Floats 示例

​	使用所选择的任何编辑器创建下面的java程序 C:/> Guava

*GuavaTester.java*

```java
import java.util.List;

import com.google.common.primitives.Floats;

public class GuavaTester {

   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testFloats();
   }

   private void testFloats(){
      float[] floatArray = {1.0f,2.0f,3.0f,4.0f,5.0f,6.0f,7.0f,8.0f,9.0f};

      //convert array of primitives to array of objects
      List<Float> objectArray = Floats.asList(floatArray);
      System.out.println(objectArray.toString());

      //convert array of objects to array of primitives
      floatArray = Floats.toArray(objectArray);
      System.out.print("[ ");
      for(int i = 0; i< floatArray.length ; i++){
         System.out.print(floatArray[i] + " ");
      }
      System.out.println("]");
      //check if element is present in the list of primitives or not
      System.out.println("5.0 is in list? "+ Floats.contains(floatArray, 5.0f));

      //return the index of element
      System.out.println("5.0 position in list "+ Floats.indexOf(floatArray, 5.0f));

      //Returns the minimum		
      System.out.println("Min: " + Floats.min(floatArray));

      //Returns the maximum		
      System.out.println("Max: " + Floats.max(floatArray));	
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
[1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0]
[ 1.0 2.0 3.0 4.0 5.0 6.0 7.0 8.0 9.0 ]
5.0 is in list? true
5.0 position in list 4
Min: 1.0
Max: 9.0
```

# Doubles

Doubles是double基本类型的实用工具类。

## 	类声明

​	以下是com.google.common.primitives.Doubles类的声明：

```java
@GwtCompatible(emulated=true)
   public final class Doubles
      extends Object
```

## 	字段

| S.N. | 字段及说明                                                   |
| :--- | :----------------------------------------------------------- |
| 1    | **static int BYTES**  			所需要的字节数来表示基本的double值。 |

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static List asList(double... backingArray)**  			返回由指定数组支持的固定大小的列表，类似 Arrays.asList(Object[]). |
| 2    | **static int compare(double a, double b)**  			比较两个指定的double值。 |
| 3    | **static double[] concat(double[]... arrays)**  			每个数组提供组合成一个单一的数组，则返回值。 |
| 4    | **static boolean contains(double[] array, double target)**  			返回true，如果target是否存在在任何地方数组元素。 |
| 5    | **static double[] ensureCapacity(double[] array, int minLength, int padding)**  			返回一个包含相同的值数组的数组，但保证是一个规定的最小长度。 |
| 6    | **static int hashCode(double value)**  			返回哈希码的值;等于调用 ((Double) value).hashCode() 的结果. |
| 7    | **static int indexOf(double[] array, double target)**  			返回目标数组的首次出现的索引值。 |
| 8    | **static int indexOf(double[] array, double[] target)**  			返回指定目标的第一个匹配的起始位置数组内，或-1，如果不存在。 |
| 9    | **static boolean isFinite(double value)**  			返回true，如果值代表一个实数。 |
| 10   | **static String join(String separator, double... array)**  			返回包含所提供的double 值的字符串，所指定的转换为字符串 Double.toString(double), 及相隔分离。 |
| 11   | **static int lastIndexOf(double[] array, double target)**  			返回target 在数组中最后一个出现的索引值。 |
| 12   | **static Comparator lexicographicalComparator()**  			返回一个比较，比较两个double阵列字典顺序。 |
| 13   | **static double max(double... array)**  			返回存在于数组的最大值，使用比较为相同的规则 Math.max(double, double). |
| 14   | **static double min(double... array)**  			返回存在于数组的最小值，使用比较为相同的规则 Math.min(double, double). |
| 15   | **static Converter stringConverter()**  			返回字符串转换之间和double采用序列化器对象 Double.valueOf(java.lang.String) and Double.toString(). |
| 16   | **static double[] toArray(Collection collection)**  			返回一个包含集合中的每个值的数组，转换为double值的方式Number.doubleValue(). |
| 17   | **static Double tryParse(String string)**  			解析指定的字符串作为一个双精度浮点值。 |

## 	方法继承

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Doubles 示例

​	使用所选择的任何编辑器创建下面的java程序 C:/> Guava

*GuavaTester.java*

```java
import java.util.List;

import com.google.common.primitives.Doubles;

public class GuavaTester {

   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testDoubles();
   }

   private void testDoubles(){
      double[] doubleArray = {1.0,2.0,3.0,4.0,5.0,6.0,7.0,8.0,9.0};

      //convert array of primitives to array of objects
      List<Double> objectArray = Doubles.asList(doubleArray);
      System.out.println(objectArray.toString());

      //convert array of objects to array of primitives
      doubleArray = Doubles.toArray(objectArray);
      System.out.print("[ ");
      for(int i = 0; i< doubleArray.length ; i++){
         System.out.print(doubleArray[i] + " ");
      }
      System.out.println("]");
      //check if element is present in the list of primitives or not
      System.out.println("5.0 is in list? "+ Doubles.contains(doubleArray, 5.0f));

      //return the index of element
      System.out.println("5.0 position in list "+ Doubles.indexOf(doubleArray, 5.0f));

      //Returns the minimum		
      System.out.println("Min: " + Doubles.min(doubleArray));

      //Returns the maximum		
      System.out.println("Max: " + Doubles.max(doubleArray));	
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
[1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0]
[ 1.0 2.0 3.0 4.0 5.0 6.0 7.0 8.0 9.0 ]
5.0 is in list? true
5.0 position in list 4
Min: 1.0
Max: 9.0
```

# Chars

Chars是基本char类型的实用工具类。

## 	类声明

​	以下是com.google.common.primitives.Chars类的声明：

```java
@GwtCompatible(emulated=true)
   public final class Chars
      extends Object
```

## 	字段

| S.N. | 字段及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static int BYTES**  			所需要的字节数来表示一个原始char值。 |

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static List asList(char... backingArray)**  			返回由指定数组支持的固定大小的列表，类似 Arrays.asList(Object[]). |
| 2    | **static char checkedCast(long value)**  			返回char值等于**value**值，如果可能的话。 |
| 3    | **static int compare(char a, char b)**  			比较两个指定的char值。 |
| 4    | **static char[] concat(char[]... arrays)**  			每个数组提供组合成一个单一的数组，则返回值。 |
| 5    | **static boolean contains(char[] array, char target)**  			返回true，如果target是否存在在任何地方数组元素。 |
| 6    | **static char[] ensureCapacity(char[] array, int minLength, int padding)**  			返回一个包含相同的值数组的数组，但保证是一个规定的最小长度。 |
| 7    | **static char fromByteArray(byte[] bytes)**  			返回char值，其大端表示被存储在第一个2字节的字节;相当于 ByteBuffer.wrap(bytes).getChar(). |
| 8    | **static char fromBytes(byte b1, byte b2)**  			返回char值的字节表示是给定2个字节，在big-endian的顺序;相当于 Chars.fromByteArray(new byte[] {b1, b2}). |
| 9    | **static int hashCode(char value)**  			返回哈希码的值;等于调用的结果 ((Character) value).hashCode(). |
| 10   | **static int indexOf(char[] array, char target)**  			返回目标数组的首次出现的索引值。 |
| 11   | **static int indexOf(char[] array, char[] target)**  			返回指定目标的第一个匹配的起始位置数组内，或-1，如果不存在。 |
| 12   | **static String join(String separator, char... array)**  			返回包含由分离器分离所提供的char值字符串。 |
| 13   | **static int lastIndexOf(char[] array, char target)**  			返回target 在数组中最后一个出现的索引值。 |
| 14   | **static Comparator lexicographicalComparator()**  			返回一个比较器，它比较两个字符数组字典顺序。 |
| 15   | **static char max(char... array)**  			返回在数组中的最大值。 |
| 16   | **static char min(char... array)**  			返回出现在数组最小值。 |
| 17   | **static char saturatedCast(long value)**  			返回值char最近的值。 |
| 18   | **static char[] toArray(Collection collection)**  			复制字符实例的集合到原始char值的新数组。 |
| 19   | **static byte[] toByteArray(char value)**  			返回在2元素的字节数组值大端表示;相当于 ByteBuffer.allocate(2).putChar(value).array(). |

## 	方法继承

​	这个类从以下类继承的方法：

- ​			java.lang.Object

## 	Chars 例子

​	选择使用任何编辑器创建以下java程序在 C:/> Guava

*GuavaTester.java*

```java
import java.util.List;
import com.google.common.primitives.Chars;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testChars();
   }

   private void testChars(){
      char[] charArray = {'a','b','c','d','e','f','g','h'};

      //convert array of primitives to array of objects
      List<Character> objectArray = Chars.asList(charArray);
      System.out.println(objectArray.toString());

      //convert array of objects to array of primitives
      charArray = Chars.toArray(objectArray);
      System.out.print("[ ");
      for(int i = 0; i< charArray.length ; i++){
         System.out.print(charArray[i] + " ");
      }
      System.out.println("]");
      //check if element is present in the list of primitives or not
      System.out.println("c is in list? "+ Chars.contains(charArray, 'c'));

      //return the index of element
      System.out.println("c position in list "+ Chars.indexOf(charArray, 'c'));

      //Returns the minimum		
      System.out.println("Min: " + Chars.min(charArray));

      //Returns the maximum		
      System.out.println("Max: " + Chars.max(charArray));	
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
[a, b, c, d, e, f, g, h]
[ a b c d e f g h ]
c is in list? true
c position in list 2
Min: a
Max: h
```

# Booleans

Booleans是布尔型基本的实用工具类。

## 	类声明

​	以下是com.google.common.primitives.Booleans类的声明：

```java
@GwtCompatible(emulated=true)
   public final class Booleans
      extends Object
```

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static List asList(boolean... backingArray)**  			返回由指定数组支持的固定大小的列表，类似 Arrays.asList(Object[]). |
| 2    | **static int compare(boolean a, boolean b)**  			比较两个指定的布尔值的标准方式(假的比真的少考虑以下)。 |
| 3    | **static boolean[] concat(boolean[]... arrays)**  			每个数组提供组合成一个单一的数组，则值返回。 |
| 4    | **static boolean contains(boolean[] array, boolean target)**  			返回true，如果target存在在任何地方数组元素。 |
| 5    | **static int countTrue(boolean... values)**  			返回为true值的数目。 |
| 6    | **static boolean[] ensureCapacity(boolean[] array, int minLength, int padding)**  			返回一个包含相同的值数组的数组，但保证是一个规定的最小长度。 |
| 7    | **static int hashCode(boolean value)**  			返回哈希码的值;等于调用的结果 ((Boolean) value).hashCode(). |
| 8    | **static int indexOf(boolean[] array, boolean target)**  			返回目标数组的首次出现的索引值。 |
| 9    | **static int indexOf(boolean[] array, boolean[] target)**  			返回指定目标的第一个匹配的起始位置数组内，或-1，如果不存在。 |
| 10   | **static String join(String separator, boolean... array)**  			返回包含由分离器分离所提供的布尔值的字符串。 |
| 11   | **static int lastIndexOf(boolean[] array, boolean target)**  			返回target 在数组中最后一个出现的索引值。 |
| 12   | **static Comparator lexicographicalComparator()**  			返回一个比较器，它比较两个布尔数组字典顺序。 |
| 13   | **static boolean[] toArray(Collection collection)**  			复制Boolean实例集合到原始的布尔值的新数组。 |

## 	方法继承

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	Booleans 示例

​	使用所选择的任何编辑器创建下面的java程序 C:/> Guava

*GuavaTester.java*

```java
import java.util.List;
import com.google.common.primitives.Booleans;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testBooleans();
   }

   private void testBooleans(){
      boolean[] booleanArray = {true,true,false,true,true,false,false};

      //convert array of primitives to array of objects
      List<Boolean> objectArray = Booleans.asList(booleanArray);
      System.out.println(objectArray.toString());

      //convert array of objects to array of primitives
      booleanArray = Booleans.toArray(objectArray);
      System.out.print("[ ");
      for(int i = 0; i< booleanArray.length ; i++){
         System.out.print(booleanArray[i] + " ");
      }
      System.out.println("]");
      //check if element is present in the list of primitives or not
      System.out.println("true is in list? "+ Booleans.contains(booleanArray, true));

      //return the first index of element
      System.out.println("true position in list "+ Booleans.indexOf(booleanArray, true));

      //Returns the count of true values	
      System.out.println("true occured: " + Booleans.countTrue());

      //Returns the comparisons		
      System.out.println("false Vs true: " + Booleans.compare(false, true));	
      System.out.println("false Vs false: " + Booleans.compare(false, false));	
      System.out.println("true Vs false: " + Booleans.compare(true, false));	
      System.out.println("true Vs true: " + Booleans.compare(true, true));	
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
[true, true, false, true, true, false, false]
[ true true false true true false false ]
true is in list? true
true position in list 0
true occured: 0
false Vs true: -1
false Vs false: 0
true Vs false: 1
true Vs true: 0
```

# IntMath

IntMath提供整型的实用方法。

## 	类声明

​	以下是com.google.common.math.IntMath类的声明：

```java
@GwtCompatible(emulated=true)
public final class IntMath
   extends Object
```

## 	方法

| S.N. | 方法及说明                                                   |
| :--- | :----------------------------------------------------------- |
| 1    | **static int binomial(int n, int k)**  			返回n个选择K，也被称为n和k，或Integer.MAX_VALUE的二项式系数，如果结果在一个int不适合。 |
| 2    | **static int checkedAdd(int a, int b)**  			返回a和b的总和，只要它不会溢出。 |
| 3    | **static int checkedMultiply(int a, int b)**  			返回a和b的产物，只要它不会溢出。 |
| 4    | **static int checkedPow(int b, int k)**  			返回b的第k幂，只要它不会溢出。 |
| 5    | **static int checkedSubtract(int a, int b)**  			返回a和b的差，只要它不会溢出。 |
| 6    | **static int divide(int p, int q, RoundingMode mode)**  			返回除以p由q，使用指定RoundingMode的四舍五入结果。 |
| 7    | **static int factorial(int n)**  			返回n个！，也就是说，前n个正整数的乘积，如果n==0则返回1，或者是Integer.MAX_VALUE如果结果不适合在一个int值。 |
| 8    | **static int gcd(int a, int b)**  			返回a, b的最大公约数。 |
| 9    | **static boolean isPowerOfTwo(int x)**  			返回true，如果x代表两个幂。 |
| 10   | **static int log10(int x, RoundingMode mode)**  			返回基数为10的对数x，根据指定的舍入模式圆形。 |
| 11   | **static int log2(int x, RoundingMode mode)**  			返回基数为2-对数x，根据指定的舍入模式圆形。 |
| 12   | **static int mean(int x, int y)**  			返回x和y的算术平均值，取整。 |
| 13   | **static int mod(int x, int m)**  			返回x模m，一个非负的值小于m以下。 |
| 14   | **static int pow(int b, int k)**  			返回b的第k幂。 |
| 15   | **static int sqrt(int x, RoundingMode mode)**  			返回x的平方根，大概指定的舍入模式。 |

## 	方法继承

​	这个类从以下类继承的方法：

- ​			java.lang.Object

## 	IntMath 例子

​	选择使用任何编辑器创建以下java程序在 C:/> Guava

*GuavaTester.java*

```java
import java.math.RoundingMode;
import com.google.common.math.IntMath;

public class GuavaTester {

   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testIntMath();
   }

   private void testIntMath(){
      try{
         System.out.println(IntMath.checkedAdd(Integer.MAX_VALUE, Integer.MAX_VALUE));
      }catch(ArithmeticException e){
         System.out.println("Error: " + e.getMessage());
      }

      System.out.println(IntMath.divide(100, 5, RoundingMode.UNNECESSARY));
      try{
         //exception will be thrown as 100 is not completely divisible by 3 thus rounding
         // is required, and RoundingMode is set as UNNESSARY
         System.out.println(IntMath.divide(100, 3, RoundingMode.UNNECESSARY));
      }catch(ArithmeticException e){
         System.out.println("Error: " + e.getMessage());
      }

      System.out.println("Log2(2): "+IntMath.log2(2, RoundingMode.HALF_EVEN));

      System.out.println("Log10(10): "+IntMath.log10(10, RoundingMode.HALF_EVEN));

      System.out.println("sqrt(100): "+IntMath.sqrt(IntMath.pow(10,2), RoundingMode.HALF_EVEN));

      System.out.println("gcd(100,50): "+IntMath.gcd(100,50));

      System.out.println("modulus(100,50): "+IntMath.mod(100,50));

      System.out.println("factorial(5): "+IntMath.factorial(5));
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
Error: overflow
20
Error: mode was UNNECESSARY, but rounding was necessary
Log2(2): 1
Log10(10): 1
sqrt(100): 10
gcd(100,50): 50
modulus(100,50): 0
factorial(5): 120
```

# LongMath

LongMath提供long基础类型的实用方法。

## 	类声明

​	以下是com.google.common.math.LongMath类的声明：

```java
@GwtCompatible(emulated=true)
public final class LongMath
   extends Object
```

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static long binomial(int n, int k)**  			返回n个选择K，也称为n和k，或为Long.MAX_VALUE的二项式系数，如果long结果不相符。 |
| 1    | **static long checkedAdd(long a, long b)**  			返回a和b的总和，只要它不会溢出。 |
| 2    | **static long checkedMultiply(long a, long b)**  			返回a和b的产物，只要它不会溢出。 |
| 3    | **static long checkedPow(long b, int k)**  			返回b的第k幂，只要它不会溢出。 |
| 4    | **static long checkedSubtract(long a, long b)**  			返回a和b的差，只要它不会溢出。 |
| 5    | **static long divide(long p, long q, RoundingMode mode)**  			返回除以p由q，使用指定的RoundingMode四舍五入的结果。 |
| 6    | **static long factorial(int n)**  			返回n！，也就是说，前n个正整数的乘积，如果n==则返回1，或为Long.MAX_VALUE如果结果long不相符。 |
| 7    | **static long gcd(long a, long b)**  			返回a, b的最大公约数。 |
| 8    | **static boolean isPowerOfTwo(long x)**  			返回true，如果x代表两个幂。 |
| 9    | **static int log10(long x, RoundingMode mode)**  			返回基数为10的对数x，根据指定的舍入模式圆形。 |
| 10   | **static int log2(long x, RoundingMode mode)**  			返回基数为2-对数x，根据指定的舍入模式圆形。 |
| 11   | **static long mean(long x, long y)**  			返回x和y的算术平均值，四舍五入向负无穷大。 |
| 12   | **static int mod(long x, int m)**  			返回x模m，一个非负的值小于m以下。 |
| 13   | **static long mod(long x, long m)**  			返回x模m，一个非负的值小于m以下。 |
| 14   | **static long pow(long b, int k)**  			返回b为第k幂。 |
| 15   | **static long sqrt(long x, RoundingMode mode)**  			返回x的平方根，大概指定的舍入模式。 |

## 	方法继承

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	LongMath 示例

​	使用所选择的任何编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import java.math.RoundingMode;
import com.google.common.math.LongMath;

public class GuavaTester {

   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testLongMath();
   }

   private void testLongMath(){
      try{
         System.out.println(LongMath.checkedAdd(Long.MAX_VALUE, Long.MAX_VALUE));
      }catch(ArithmeticException e){
         System.out.println("Error: " + e.getMessage());
      }

      System.out.println(LongMath.divide(100, 5, RoundingMode.UNNECESSARY));
      try{
         //exception will be thrown as 100 is not completely divisible by 3 thus rounding
         // is required, and RoundingMode is set as UNNESSARY
         System.out.println(LongMath.divide(100, 3, RoundingMode.UNNECESSARY));
      }catch(ArithmeticException e){
         System.out.println("Error: " + e.getMessage());
      }

      System.out.println("Log2(2): "+LongMath.log2(2, RoundingMode.HALF_EVEN));

      System.out.println("Log10(10): "+LongMath.log10(10, RoundingMode.HALF_EVEN));

      System.out.println("sqrt(100): "+LongMath.sqrt(LongMath.pow(10,2), RoundingMode.HALF_EVEN));

      System.out.println("gcd(100,50): "+LongMath.gcd(100,50));

      System.out.println("modulus(100,50): "+LongMath.mod(100,50));

      System.out.println("factorial(5): "+LongMath.factorial(5));
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
Error: overflow
20
Error: mode was UNNECESSARY, but rounding was necessary
Log2(2): 1
Log10(10): 1
sqrt(100): 10
gcd(100,50): 50
modulus(100,50): 0
factorial(5): 120
```

# BigIntegerMath

BigIntegerMath提供BigInteger的实用方法。

## 	类声明

​	以下是com.google.common.math.BigIntegerMath类的声明：

```java
@GwtCompatible(emulated=true)
public final class BigIntegerMath
   extends Object
```

## 	方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **static BigInteger binomial(int n, int k)**  			返回n选择k，也被称为n和k的二项式系数，即n! / (k! (n - k)!)。 |
| 2    | **static BigInteger divide(BigInteger p, BigInteger q, RoundingMode mode)**  			返回除以p由q，使用指定的RoundingMode四舍五入的结果。 |
| 3    | **static BigInteger factorial(int n)**  			返回n个！，即，在第一n个正整数的乘积，或1如果n== 0。 |
| 4    | **static boolean isPowerOfTwo(BigInteger x)**  			返回true，如果x代表两个幂。 |
| 5    | **static int log10(BigInteger x, RoundingMode mode)**  			返回基数为10的对数x，根据指定的舍入模式范围。 |
| 6    | **static int log2(BigInteger x, RoundingMode mode)**  			返回基数为2-对数x，根据指定的舍入模式圆形。 |
| 7    | **static BigInteger sqrt(BigInteger x, RoundingMode mode)**  			返回x的平方根，大概指定的舍入模式。 |

## 	继承的方法

​	这个类继承了以下类方法：

- ​			java.lang.Object

## 	BigIntegerMath 示例

​	使用所选择的任何编辑器创建下面的java程序 C:/> Guava

*GuavaTester.java*

```java
import java.math.BigInteger;
import java.math.RoundingMode;

import com.google.common.math.BigIntegerMath;

public class GuavaTester {

   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      tester.testBigIntegerMath();
   }
   private void testBigIntegerMath(){
      System.out.println(BigIntegerMath.divide(BigInteger.TEN, new BigInteger("2"), RoundingMode.UNNECESSARY));
      try{
         //exception will be thrown as 100 is not completely divisible by 3 thus rounding
         // is required, and RoundingMode is set as UNNESSARY
         System.out.println(BigIntegerMath.divide(BigInteger.TEN, new BigInteger("3"), RoundingMode.UNNECESSARY));
      }catch(ArithmeticException e){
         System.out.println("Error: " + e.getMessage());
      }

      System.out.println("Log2(2): "+BigIntegerMath.log2(new BigInteger("2"), RoundingMode.HALF_EVEN));

      System.out.println("Log10(10): "+BigIntegerMath.log10(BigInteger.TEN, RoundingMode.HALF_EVEN));

      System.out.println("sqrt(100): "+BigIntegerMath.sqrt(BigInteger.TEN.multiply(BigInteger.TEN), RoundingMode.HALF_EVEN));

      System.out.println("factorial(5): "+BigIntegerMath.factorial(5));
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
5
Error: Rounding necessary
Log2(2): 1
Log10(10): 1
sqrt(100): 10
factorial(5): 120
```

# Multimap

多重映射接口扩展映射，使得其键一次可被映射到多个值。

## 	接口声明

​	以下是com.google.common.collect.Multimap<K，V>接口的声明：

```java
@GwtCompatible
public interface Multimap<K,V>
```

## 	接口方法

| S.N. | 方法及说明                                                   |
| ---- | ------------------------------------------------------------ |
| 1    | **Map> asMap()**  			返回此multimap中的视图，从每个不同的键在键的关联值的非空集合映射。 |
| 2    | **void clear()**  			将删除所有multimap中的键值对，留下空。 |
| 3    | **boolean containsEntry(Object key, Object value)**  			返回true如果此多重映射包含至少一个键 - 值对用键键和值value。 |
| 4    | **boolean containsKey(Object key)**  			返回true，如果这个multimap中至少包含一个键值对的键key。 |
| 5    | **boolean containsValue(Object value)**  			返回true，如果这个multimap至少包含一个键值对的值值。 |
| 6    | **Collection> entries()**  			返回包含在此multimap中，为Map.Entry的情况下，所有的键 - 值对的视图集合。 |
| 7    | **boolean equals(Object obj)**  			比较指定对象与此多重映射是否相等。 |
| 8    | **Collection get(K key)**  			返回，如果有的话，在这个multimap中键关联的值的视图集合。 |
| 9    | **int hashCode()**  			返回此多重映射的哈希码。     |
| 10   | **boolean isEmpty()**  			返回true，如果这个multimap中未包含键 - 值对。 |
| 11   | **Multiset keys()**  			返回一个视图集合包含从每个键值对这个multimap中的关键，没有折叠重复。 |
| 12   | **Set keySet()**  			Returns a view collection of all distinct keys contained in this multimap. |
| 13   | **boolean put(K key, V value)**  			存储键 - 值对在这个multimap中。 |
| 14   | **boolean putAll(K key, Iterable values)**  			存储一个键 - 值对在此multimap中的每个值，都使用相同的键 key。 |
| 15   | **boolean putAll(Multimap multimap)**  			存储了所有键 - 值对多重映射在这个multimap中，通过返回 multimap.entries() 的顺序. |
| 16   | **boolean remove(Object key, Object value)**  			删除一个键 - 值对用键键，并从该多重映射的值的值，如果这样的存在。 |
| 17   | **Collection removeAll(Object key)**  			删除与键键关联的所有值。 |
| 18   | **Collection replaceValues(K key, Iterable values)**  			存储与相同的键值，替换任何现有值的键的集合。 |
| 19   | **int size()**  			返回此多重映射键 - 值对的数量。  |
| 20   | **Collection values()**  			返回一个视图集合包含从包含在该multimap中的每个键 - 值对的值，而不发生重复 (so values().size() == size()). |

## 	Multimap 示例

​	使用所选择的任何编辑器创建下面的java程序 **C:/> Guava**

*GuavaTester.java*

```java
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.Multimap;

public class GuavaTester {
   public static void main(String args[]){
      GuavaTester tester = new GuavaTester();
      Multimap<String,String> multimap = tester.getMultimap();

      List<String> lowerList = (List<String>)multimap.get("lower");
      System.out.println("Initial lower case list");
      System.out.println(lowerList.toString());
      lowerList.add("f");
      System.out.println("Modified lower case list");
      System.out.println(lowerList.toString());

      List<String> upperList = (List<String>)multimap.get("upper");
      System.out.println("Initial upper case list");
      System.out.println(upperList.toString());
      upperList.remove("D");
      System.out.println("Modified upper case list");
      System.out.println(upperList.toString());

      Map<String, Collection<String>> map = multimap.asMap();
      System.out.println("Multimap as a map");
      for (Map.Entry<String,  Collection<String>> entry : map.entrySet()) {
         String key = entry.getKey();
         Collection<String> value =  multimap.get("lower");
         System.out.println(key + ":" + value);
      }

      System.out.println("Keys of Multimap");
      Set<String> keys =  multimap.keySet();
      for(String key:keys){
         System.out.println(key);
      }

      System.out.println("Values of Multimap");
      Collection<String> values = multimap.values();
      System.out.println(values);
   }	

   private Multimap<String,String> getMultimap(){
      //Map<String, List<String>>
      // lower -> a, b, c, d, e 
      // upper -> A, B, C, D

      Multimap<String,String> multimap = ArrayListMultimap.create();		

      multimap.put("lower", "a");
      multimap.put("lower", "b");
      multimap.put("lower", "c");
      multimap.put("lower", "d");
      multimap.put("lower", "e");

      multimap.put("upper", "A");
      multimap.put("upper", "B");
      multimap.put("upper", "C");
      multimap.put("upper", "D");		
      return multimap;		
   }
}
```

## 	验证结果

​	使用javac编译器编译如下类

```bash
C:\Guava>javac GuavaTester.java
```

​	现在运行GuavaTester看到的结果

```bash
C:\Guava>java GuavaTester
```

​	看到结果。

```bash
Initial lower case list
[a, b, c, d, e]
Modified lower case list
[a, b, c, d, e, f]
Initial upper case list
[A, B, C, D]
Modified upper case list
[A, B, C]
Multimap as a map
upper:[a, b, c, d, e, f]
lower:[a, b, c, d, e, f]
Keys of Multimap
upper
lower
Values of Multimap
[A, B, C, a, b, c, d, e, f]
```

