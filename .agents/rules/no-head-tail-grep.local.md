## Prohibition of directly filtering stdout and stderr with head / tail / grep

Logs are the only channel through which a CLI application can return information, and filtering that channel directly with scripts like the ones in the title is a foolish act that throws information away for no reason. Strictly avoid situations where a failure leaves you without logs and forces you to rerun the entire process. Filter logs only while simultaneously saving the full log to a file.

<figure>
<figcaption>Prohibited</figcaption>

```shellsession
$ (timeout 0.1 seq inf || true) | tail -n 5
```

</figure>
<figure>
<figcaption>OK</figcaption>

```shellsession
$ (timeout 0.1 seq inf || true) | tee .tmp/seq.log | tail -n 5
```

</figure>
