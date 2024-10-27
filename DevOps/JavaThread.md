# Java 多线程示例

## 创建线程

1、继承 Thread

```java
public class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println(Thread.currentThread().getName());
    }

    public static void main(String[] args) {
        Thread thread = new MyThread();
        thread.start();
    }
}
```

2、实现 Runnable

```java
public class Main {
    public static void main(String[] args) {
        Runnable runnable = () -> System.out.println(Thread.currentThread().getName());
        new Thread(runnable).start();
    }
}
```

3、实现 Callable

```java
import java.util.concurrent.Callable;
import java.util.concurrent.FutureTask;

public class Main {
    public static void main(String[] args) throws Exception {
        Callable<String> callable = () -> Thread.currentThread().getName();
        FutureTask<String> futureTask = new FutureTask<>(callable);
        new Thread(futureTask).start();
        System.out.println(futureTask.get());
    }
}
```

## 线程状态

定义在 java.lang.Thread.State

```java
public enum State {
    /* 新建状态，还没有调用 start() 方法 */
    NEW,

    /* 可运行状态，就绪及运行中 */
    RUNNABLE,

    /* 阻塞状态，等待 monitor 索引进入 synchronized 代码块或方法，分为如下两种情况：
     * 等待 monitor 锁以进入 synchronized 代码块或方法
     * 调用 Object.wait() 方法后重新等待 monitor 锁进入 synchronized 代码块或方法
     */
    BLOCKED,

    /*
     * 等待状态，等待另一个线程执行特定动作，调用了如下方法后进入等待状态：
     * 不带超时时间的 Object.wait()
     * 不带超时时间的 Thread.join()
     * LockSupport.park()
     * 
     * 另一个线程调用如下方法回到 RUNNABLE 状态
     * Object.nofify()
     * Object.notifyAll()
     * LockSupport.unpark()
     */
    WAITING,

    /**
     * 超时等待状态，用正数时间调用了如下方法后进入超时等待状态：
     * Thread.sleep(long)
     * Object.wait(long)
     * Thread.join(long)
     * LockSupport.parkNanos()
     * LockSupport.parkUntil()
     * 
     * 另一个线程调用如下方法回到 RUNNABLE 状态
     * Object.nofify()
     * Object.notifyAll()
     * LockSupport.unpark()
     */
    TIMED_WAITING,

    /* 终止状态 */
    TERMINATED;
}
```

首先定义一个 SleepUtils 工具类

```java
public class SleepUtils {
    public static void sleep(long mills) {
        try {
            Thread.sleep(mills);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
```

示例一：基本的 NEW、RUNNABLE、TERMINATED 状态，Thread.sleep(long) 会进入 TIMED_WAITING 状态

```java
public class Main {
    public static void main(String[] args) throws Exception {
        Runnable runnable = () -> {
            System.out.println("2 " + Thread.currentThread().getState()); // RUNNABLE
            SleepUtils.sleep(2000);
        };

        Thread thread = new Thread(runnable);
        System.out.println("1 " + thread.getState()); // NEW

        thread.start();
        SleepUtils.sleep(1000);
        System.out.println("3 " + thread.getState()); // TIMED_WAITING

        thread.join();
        System.out.println("4 " + thread.getState()); // TERMINATED
    }
}
```

示例二：等待进入 synchronized 块时为 BLOCKED 状态

```java
public class Main {

    private static final Object lock = new Object();

    public static void main(String[] args) throws Exception {
        Runnable r1 = () -> {
            synchronized (lock) {
                SleepUtils.sleep(3000);
            }
        };

        Thread t1 = new Thread(r1);
        Thread t2 = new Thread(r1);

        t1.start();
        SleepUtils.sleep(1000);
        t2.start();

        System.out.println("1 " + t1.getState()); // TIMED_WAITING
        System.out.println("2 " + t2.getState()); // BLOCKED
    }
}
```

示例三：Object.wait() 不带超时参数会进入 WAITING 状态，带超时参数会进入 TIMED_WAITING 状态

如果调用的是 ```lock.wait(2000)``` 则1处的状态为 TIMED_WAITING

```java
public class Main {
    private static final Object lock = new Object();

    public static void main(String[] args) throws Exception {
        Runnable r1 = () -> {
            synchronized (lock) {
                try {
                    lock.wait();
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
            }
        };

        Runnable r2 = () -> {
            synchronized (lock) {
                lock.notify();
            }
        };

        Thread t1 = new Thread(r1);
        Thread t2 = new Thread(r2);

        t1.start();
        SleepUtils.sleep(1000);
        System.out.println("1 " + t1.getState()); // WAITING

        t2.start();
        SleepUtils.sleep(1000);
        System.out.println("2 " + t1.getState()); // TERMINATED
    }
}
```

示例四：调用 Object.wait() 方法后重新等待 monitor 锁进入 synchronized 代码块或方法

跟示例三比，就是 notify() 后不要立刻释放 monitor，此时 t1 将进入 BLOCKED 状态

```java
public class Main {
    private static final Object lock = new Object();

    public static void main(String[] args) throws Exception {
        Runnable r1 = () -> {
            synchronized (lock) {
                try {
                    lock.wait();
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
            }
        };

        Runnable r2 = () -> {
            synchronized (lock) {
                lock.notify();
                SleepUtils.sleep(5000);
            }
        };

        Thread t1 = new Thread(r1);
        Thread t2 = new Thread(r2);

        t1.start();
        SleepUtils.sleep(1000);
        System.out.println("1 " + t1.getState()); // WAITING

        t2.start();
        SleepUtils.sleep(1000);
        System.out.println("2 " + t1.getState()); // BLOCKED
        System.out.println("3 " + t2.getState()); // TIMED_WAITING

        SleepUtils.sleep(4000);
        System.out.println("4 " + t1.getState()); // TERMINATED
        System.out.println("5 " + t2.getState()); // TERMINATED
    }
}
```

示例五：Object.wait () 超时后会继续向下执行

```java
public class Main {
    private static final Object lock = new Object();

    public static void main(String[] args) throws Exception {
        Runnable r1 = () -> {
            synchronized (lock) {
                try {
                    lock.wait(2000);
                    System.out.println("Run Here"); // 打印 Run Here
                } catch (InterruptedException e) {
                    throw new RuntimeException(e);
                }
            }
        };

        Thread t1 = new Thread(r1);
        t1.start();
        SleepUtils.sleep(1000);
        System.out.println("1 " + t1.getState()); // TIMED_WAITING
    }
}
```

示例六：Thread.join() 会进入 WAITING 状态

```java
public class Main {
    public static void main(String[] args) throws Exception {
        Thread t1 = new Thread(() -> SleepUtils.sleep(2000));
        Thread t2 = new Thread(() -> {
            try {
                t1.join();
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        });

        t1.start();
        t2.start();

        SleepUtils.sleep(1000);
        System.out.println("1 " + t1.getState()); // TIMED_WAITING
        System.out.println("2 " + t2.getState()); // WAITING

        SleepUtils.sleep(1000);
        System.out.println("3 " + t1.getState()); // TERMINATED
        System.out.println("4 " + t2.getState()); // TERMINATED
    }
}
```

示例七：通过 LockSupport.park() 进入 WAITING 状态，使用 AQS 实现的可重入锁的无参 lock() 方法会调用该方法。

```java
import java.util.concurrent.locks.ReentrantLock;

public class Main {
    public static void main(String[] args) throws Exception {
        ReentrantLock lock = new ReentrantLock();
        
        Runnable r1 = () -> {
            lock.lock();
            try {
                SleepUtils.sleep(2000);
            } finally {
                lock.unlock();
            }
        };

        Thread t1 = new Thread(r1);
        Thread t2 = new Thread(r1);

        t1.start();
        t2.start();

        SleepUtils.sleep(1000);
        System.out.println("1 " + t1.getState()); // TIMED_WAITING
        System.out.println("2 " + t2.getState()); // WAITING
    }
}
```

示例八：通过 LockSupport.parkNanos() 进入 TIMED_WAITING 状态，使用 AQS 实现的可重入锁的带超时参数的 trylock() 会调用该方法

```java
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

public class Main {
    public static void main(String[] args) throws Exception {
        ReentrantLock lock = new ReentrantLock();

        Runnable r1 = () -> {
            try {
                if(lock.tryLock(3000, TimeUnit.MILLISECONDS)) {
                    try {
                        System.out.println(Thread.currentThread().getName() + " Run Here"); // Thread-0和1均会打印
                        Thread.currentThread().sleep(2000);
                    } finally {
                        lock.unlock();
                    }
                }
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        };

        Thread t1 = new Thread(r1);
        Thread t2 = new Thread(r1);

        t1.start();
        SleepUtils.sleep(500);
        t2.start();
        SleepUtils.sleep(500);

        System.out.println("1 " + t1.getState()); // TIMED_WAITING
        System.out.println("2 " + t2.getState()); // TIMED_WAITING
    }
}
```

## ForkJoin

execute(ForkJoinTask)：异步执行tasks，无返回值
invoke(ForkJoinTask)：有调用join, 返回任务结果
submit(ForkJoinTask)：异步执行，且带 ForkJoinTask 返回值，可通过 task.get() 获取结果

### 无返回值的 MyRecursiveAction

```java
import java.util.concurrent.RecursiveAction;

public class MyRecursiveAction extends RecursiveAction {
    private int start;
    private int end;

    public MyRecursiveAction(int start, int end) {
        this.start = start;
        this.end = end;
    }

    @Override
    protected void compute() {
        if (end - start <= 10) {
            for (int i = start; i <= end; i++) {
                System.out.println(Thread.currentThread().getName() + " handle " + i);
            }
        } else {
            int middle = (start + end) / 2;
            MyRecursiveAction left = new MyRecursiveAction(start, middle);
            left.fork();
            MyRecursiveAction right = new MyRecursiveAction(middle + 1, end);
            right.fork();
        }
    }
}
```

使用 execute

```java
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.TimeUnit;

public class Main {
    public static void main(String[] args) throws Exception {
        ForkJoinPool forkJoinPool = new ForkJoinPool();
        forkJoinPool.execute(new MyRecursiveAction(0, 100));
        forkJoinPool.awaitTermination(2, TimeUnit.SECONDS);
    }
}
```

使用 invoke

```java
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.TimeUnit;

public class Main {
    public static void main(String[] args) throws Exception {
        ForkJoinPool forkJoinPool = new ForkJoinPool();
        forkJoinPool.invoke(new MyRecursiveAction(0, 100));
        forkJoinPool.awaitTermination(2, TimeUnit.SECONDS);
    }
}
```

使用 submit

```java
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.TimeUnit;

public class Main {
    public static void main(String[] args) throws Exception {
        ForkJoinPool forkJoinPool = new ForkJoinPool();
        forkJoinPool.submit(new MyRecursiveAction(0, 100));
        forkJoinPool.awaitTermination(2, TimeUnit.SECONDS);
    }
}
```

### 有返回值的 RecursiveTask

```java
import java.util.concurrent.RecursiveTask;

public class MyRecursiveTask extends RecursiveTask<Integer> {
    private int start;
    private int end;

    public MyRecursiveTask(int start, int end) {
        this.start = start;
        this.end = end;
    }

    @Override
    protected Integer compute() {
        if (end - start <= 10) {
            int result = 0;
            for (int i = start; i <= end; i++) {
                result += i;
            }
            System.out.println(Thread.currentThread().getName() + ": " + start + " ~ " + end + " => " + result);
            return result;
        } else {
            int middle = (start + end) / 2;
            MyRecursiveTask left = new MyRecursiveTask(start, middle);
            left.fork();
            MyRecursiveTask right = new MyRecursiveTask(middle + 1, end);
            right.fork();
            return left.join() + right.join();
        }
    }
}
```

使用 invoke 获取结果

```java
import java.util.concurrent.ForkJoinPool;

public class Main {
    public static void main(String[] args) {
        ForkJoinPool forkJoinPool = new ForkJoinPool();
        Integer result = forkJoinPool.invoke(new MyRecursiveTask(0, 100));
        System.out.println("result: " + result);
    }
}
```

使用 submit 获取结果

```java
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.ForkJoinTask;

public class Main {
    public static void main(String[] args) throws Exception {
        ForkJoinPool forkJoinPool = new ForkJoinPool();
        ForkJoinTask task = forkJoinPool.submit(new MyRecursiveTask(0, 100));
        System.out.println("result: " + task.get());
    }
}
```

## 线程池 ThreadPoolExecutor

submit 有返回值，execute 没有返回值

```java
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class Main {
    static class DemoTask implements Runnable {
        private int id;
        public DemoTask(int id) {
            this.id = id;
        }
        @Override
        public void run() {
            System.out.println(Thread.currentThread().getName() + " id=" + id);
            SleepUtils.sleep(5000);
        }
    }

    static class DemoThreadFactory implements ThreadFactory {
        private AtomicInteger threadNumber = new AtomicInteger(1);

        @Override
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r);
            t.setName("DemoThreadFactory-" + threadNumber.getAndIncrement());
            return t;
        }
    }
    public static void main(String[] args) {
        int corePoolSize = 3;
        int maximumPoolSize = 5;
        long keepAliveTime = 20;
        TimeUnit unit = TimeUnit.SECONDS;
        BlockingQueue<Runnable> workQueue = new ArrayBlockingQueue<>(5);
        ThreadFactory threadFactory = new DemoThreadFactory();
        RejectedExecutionHandler handler = new ThreadPoolExecutor.AbortPolicy();
        ThreadPoolExecutor executor = new ThreadPoolExecutor(corePoolSize, maximumPoolSize, keepAliveTime, unit, workQueue, threadFactory, handler);

        for (int i = 0; i < 11; i++) {
            SleepUtils.sleep(500);
            try {
                executor.execute(new DemoTask(i));
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        executor.shutdown();
    }
}
```

### 理解 SingleThreadExecutor

SingleThreadExecutor的含义不仅仅是说只有一个线程的线程池，它能**保证**任何时候都只有一个任务被执行，且能**保证**多个提交的任务按照提交的先后顺序被执行。

SingleThreadExecutor的本质是一个核心线程数和最大线程数都是1的线程池，并且不允许线程超时，多个提交的任务被按顺序放到一个无界队列中。由于只有一个执行线程，所以在任何时候都只有一个任务被执行，多个任务按提交的先后顺序被执行，如果这个唯一运行的线程在执行期间因为某些原因被关闭，那么会创建一个新的线程来取代它执行接下来的任务。

查看Executors中几种线程池的实现，可以看到 newSingleThreadExecutor 和其他线程池的实现不同，其他线程池直接返回ThreadPoolExecutor 的实例，而 newSingleThreadExecutor 则返回 FinalizableDelegatedExecutorService 的实例，源码如下。

```java
public static ExecutorService newSingleThreadExecutor() {
    return new FinalizableDelegatedExecutorService
        (new ThreadPoolExecutor(1, 1,
                                0L, TimeUnit.MILLISECONDS,
                                new LinkedBlockingQueue<Runnable>()));
}
```

一、禁止重新配置线程池

FinalizableDelegatedExecutorService 是 DelegatedExecutorService 的子类，而 DelegatedExecutorService 是一个代理类，它实现了 ExecutorService 接口的所有方法，实现方法是委托给持有的 ExecutorService。通过增加这一层代理，使得 ThreadPoolExecutor 的 set 方法不会对外暴露，从而确保返回的线程池不能被重新配置，也就保证了 newSingleThreadExecutor 永远只有一个线程执行。

二、自动关闭线程池

由于 SingleThreadExecutor 核心线程池总是 1，并且默认不允许核心线程池超时，也不允许重新配置线程池，那么一旦忘记关闭线程池，程序将被挂起，无法自己结束，这和 ThreadPoolExecutor 语义不一致。ThreadPoolExecutor 的注释中提到，如果线程池在程序中不再被引用，**并且**该线程池中没有存活的线程时，线程池将自动被关闭。对于ThreadPoolExecutor，用户可以通过设置合适的存活时间、设置核心线程数为 0 或者设置 allowCoreThreadTimeOut(true) 来确保线程池在忘记调用 shutdown 时仍能被回收。SingleThreadExecutor 返回的线程池不允许重新配置，所以FinalizableDelegatedExecutorService 中通过实现 finalize 方法来调用线程的 shutdown 方法关闭线程，这样便可以在线程池不被引用时自动被关闭。

```java
static class FinalizableDelegatedExecutorService
    extends DelegatedExecutorService {
    FinalizableDelegatedExecutorService(ExecutorService executor) {
        super(executor);
    }
    protected void finalize() {
        super.shutdown();
    }
}
```

如果还不理解上面的做法，那么只需看看下面用 FixedThreadPool 实现的单线程线程池就知道了。

因为 newFixedThreadPool 返回的线程池可以被强制转换为 ThreadPoolExecutor，所以无法确保只有一个任务被执行，而且由于没有调用shutdown，下面的程序是无法结束的。

```java
public static void main(String[] args) throws Exception {
    Runnable r = new Runnable() {
        @Override
        public void run() {
            System.out.println("www.hiwzc.com");
        }
    };

    ExecutorService es = Executors.newFixedThreadPool(1);
    es.submit(r);

    // 能够强制转换成ThreadPoolExecutor并重新配置
    ThreadPoolExecutor executor = (ThreadPoolExecutor) es;
    executor.setCorePoolSize(2);

    // 无法关闭线程并结束程序
    es = null;
    System.gc();
}
```

但如果使用SingleThreadExecutor则没有问题，代码如下：

```java
public static void main(String[] args) throws Exception {
    Runnable r = new Runnable() {
        @Override
        public void run() {
            System.out.println("www.hiwzc.com");
        }
    };

    ExecutorService es = Executors.newSingleThreadExecutor();
    es.submit(r);

    // 无法强制转换成ThreadPoolExecutor，抛ClassCastException异常
    // ThreadPoolExecutor executor = (ThreadPoolExecutor) es;
    // executor.setCorePoolSize(2);

    // 自动关闭线程，程序结束
    es = null;
    System.gc();
}
```

## ThreadLocal

```java
import java.text.SimpleDateFormat;
import java.util.Date;

public class Main {
    public static void main(String[] args) {
        ThreadLocal<SimpleDateFormat> dateFormat = ThreadLocal.withInitial(() -> new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));
        System.out.println(dateFormat.get().format(new Date()));
        dateFormat.remove();
    }
}
```

## 并发工具

### Semaphore

```java
import java.util.concurrent.Semaphore;

public class Main {
    public static void main(String[] args) {
        Semaphore semaphore = new Semaphore(3);
        for (int i = 0; i < 10; i++) {
            final int id = i;
            new Thread(() -> {
                try {
                    semaphore.acquire();
                    System.out.println(id + " running");
                    SleepUtils.sleep((id + 1) * 1000);
                    semaphore.release();
                    System.out.println(id + " finished");
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }
}
```

### CountDownLatch

```java
import java.util.concurrent.CountDownLatch;

public class Main {
    public static void main(String[] args) throws InterruptedException {
        CountDownLatch latch = new CountDownLatch(5);
        for (int i = 0; i < 5; i++) {
            final int id = i;
            new Thread(() -> {
                SleepUtils.sleep(id * 1000);
                System.out.println(id + " finished");
                latch.countDown();
            }).start();
        }
        System.out.println("CountDownLatch await");
        latch.await();
        System.out.println("All finished");
    }
}
```

### CyclicBarrier

```java
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ThreadLocalRandom;

public class Main {

    static class TaskThread extends Thread {

        CyclicBarrier barrier;

        public TaskThread(CyclicBarrier barrier) {
            this.barrier = barrier;
        }

        @Override
        public void run() {
            try {
                Thread.sleep(ThreadLocalRandom.current().nextInt(10) * 500);
                System.out.println(Thread.currentThread().getName() + " 到达栅栏 A");
                barrier.await();
                System.out.println(Thread.currentThread().getName() + " 冲出栅栏 A");

                Thread.sleep(ThreadLocalRandom.current().nextInt(10) * 500);
                System.out.println(Thread.currentThread().getName() + " 到达栅栏 B");
                barrier.await();
                System.out.println(Thread.currentThread().getName() + " 冲出栅栏 B");

                Thread.sleep(ThreadLocalRandom.current().nextInt(10) * 500);
                System.out.println(Thread.currentThread().getName() + " 到达栅栏 C");
                barrier.await();
                System.out.println(Thread.currentThread().getName() + " 冲出栅栏 C");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    public static void main(String[] args) {
        int threadNum = 5;
        CyclicBarrier barrier = new CyclicBarrier(threadNum, () -> System.out.println(Thread.currentThread().getName() + " 完成 BarrierAction"));
        for(int i = 0; i < threadNum; i++) {
            new TaskThread(barrier).start();
        }
    }
}
```

### Exchanger

```java
import java.util.concurrent.Exchanger;

public class Main {
    public static void main(String[] args) {
        Exchanger exchanger = new Exchanger();

        Runnable runnable = ()->{
            try {
                String myData = Thread.currentThread().getName();
                String exchangeData = (String) exchanger.exchange(myData);
                System.out.println("MyData=" + myData + " exchangeData=" + exchangeData);
            } catch (Exception e) {
                e.printStackTrace();
            }
        };

        Thread r1 = new Thread(runnable);
        Thread r2 = new Thread(runnable);
        r1.start();
        r2.start();

        try {
            r1.join();
            r2.join();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### SynchronousQueue

```java
import java.util.concurrent.SynchronousQueue;

public class Main {
    public static void main(String[] args) {
        SynchronousQueue<Integer> synchronousQueue = new SynchronousQueue();

        Thread producer = new Thread(() -> {
            try {
                for (int i = 0; i < 10; i++) {
                    System.out.println("Produce: " + i);
                    synchronousQueue.put(i);
                }
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        });

        Thread consumer = new Thread(() -> {
            try {
                for (int i = 0; i < 10; i++) {
                    SleepUtils.sleep(1000);
                    Integer data = synchronousQueue.take();
                    System.out.println("Consume: " + data);
                }
            } catch (InterruptedException e) {
                throw new RuntimeException(e);
            }
        });

        producer.start();
        consumer.start();

        try {
            producer.join();
            consumer.join();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```
