#!/bin/bash
export GIT_TERMINAL_PROMPT=0
export GIT_MERGE_AUTOEDIT=no

touch merge_output.txt

while read -r branch; do
    if [ -z "$branch" ]; then continue; fi

    echo "==================================" >> merge_output.txt
    echo "Merging $branch..." >> merge_output.txt
    
    git merge "origin/$branch" -m "Merge branch '$branch' into main" >> merge_output.txt 2>&1
    MERGE_RESULT=$?
    
    if [ $MERGE_RESULT -eq 0 ]; then
        echo "Successfully merged $branch" >> merge_output.txt
        git push origin --delete "$branch" >> merge_output.txt 2>&1
        PUSH_RESULT=$?
        if [ $PUSH_RESULT -eq 0 ]; then
            sed -i "/^$branch$/d" branches_to_merge.txt
        else
            echo "Failed to push delete for $branch!" >> merge_output.txt
            exit 1
        fi
    else
        echo "Conflict detected in $branch!" >> merge_output.txt
        exit 1
    fi
done < branches_to_merge.txt
echo "All branches processed." >> merge_output.txt
