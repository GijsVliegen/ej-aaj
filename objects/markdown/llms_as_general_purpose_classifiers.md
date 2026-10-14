## LLMs as general-purpose classifiers  

In practice, LLMs are often used as **general-purpose classifiers**. Instead of asking a model to generate a long response, we ask it to make a specific decision: 
 - Is this action safe? 
 - Which category does this request belong to? 
 - Should an agent escalate to a human? Is there enough information to proceed?  

Typesafe AI recognised this and build **[Jev](https://lnkd.in/efSyiXvh)** a model designed for fast, structured decisions. Its early-access release became available on 15 𝐒𝐞𝐩𝐭𝐞𝐦𝐛𝐞𝐫 2026. The broader concept is compelling: pair fast, intuitive decision-making with deliberate, deeper reasoning, and use each where it makes the most sense.  

The idea is so powerful, people have started turning regular LLM models into JEV-like models. Opensource projects like **[SimpleJev](https://lnkd.in/ejyqGcsb)** and **[OpenJev](https://openjev.com/)** explore adapting existing models like QWEN to output probabilistic decisions.  

For those of us working with LLMs, this opens up some interesting possibilities: 
 - Faster routing and tool selection 
 - Lightweight guardrails and risk classification 
 - Early detection of missing information or unsupported categories 
 - Less reliance on expensive LLM calls for routine decisions  

## Unclassifiable and uncertain

One piece I still feel is missing: a tiny bit of exploration around what the model doesn't know

How do we reliably flag 𝘮𝘪𝘴𝘴𝘪𝘯𝘨 𝘤𝘢𝘵𝘦𝘨𝘰𝘳𝘪𝘦𝘴? What happens when an input doesn't fit any of the known classes, falls outside the training distribution, or represents a genuinely new situation? It`s a critical capability of LLMs that's omitted in these classification models.  

Research is still ongoing on these parts. And in the future we might see a fully integrated solution.  
 - Flagging insuffient data: **["Knowing What’s Missing: Assessing Information Sufficiency in Question Answering"](https://lnkd.in/eT69nPk2)**
 - Flagging uncertainty: **["Beyond the Known: An Unknown-Aware Large Language Model for Open-Set Text Classification"](https://lnkd.in/eB4AzMQ5)**

#AI #LLM #AIAgents #MachineLearning #OpenSource