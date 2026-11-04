## LLMs as free-form classifiers

In my **[previous post](#blog/14-10-2026)**, I discussed using LLMs as general-purpose classifiers (JEV-like).
But what if the number of possible classes is very large, or you don't know all the classes in advance?

Consider classifying scientific texts according to the subject they report on. You might have hundreds of possible subjects, ranging from specific diseases to animal species, transmission routes or food categories.

Asking an LLM to choose from hundreds of predefined classes is not necessarily the best approach. The list becomes cumbersome, distinctions between similar classes become difficult, and new or previously unseen subjects may not fit any existing category.

## Generate, ground, assign, discover

An alternative is to use LLMs as **free-form classifiers** and **ground** the answers using **NLI**:
 - ✨ **Generate:** Let the LLM describe the subject of a text in its own words, without restricting it to a predefined list.
 - ⚓ **Ground:** Compare the generated description against a predefined set of concepts using semantic similarity or Natural Language Inference (NLI).
 - 🏷️ **Assign:** If a sufficiently strong match is found, assign the corresponding predefined class.
 - 🔎 **Discover:** If no existing class is sufficiently supported, flag the result for review and potentially introduce a new class.

## Advantages and trade-offs

This approach has some interesting **advantages**:
 - **Flexibility:** The LLM is free to describe what it finds rather than being constrained by a fixed list.
 - **Scalability:** You can work with large classification systems without having to provide every possible class as an input option.
 - **Discoverability:** Previously unseen subjects can be identified rather than forced into an inappropriate category.
 - **Consistency:** The final output is still grounded in a controlled vocabulary, making it suitable for downstream analysis.

Of course, there are trade-offs. This approach is slower and generally more expensive than using a dedicated decision model such as Jev. It also requires maintaining a well-defined set of concepts, together with appropriate semantic matching thresholds and validation mechanisms.
