Sequencer = function(){throw new Error("This is a static class")};
Sequencer.list = {};

Sequencer.list["Action Sequence Key"] = {
    repeat: true, // True/False
    shuffle: true, // Index start at random
    sequence: [
        // {cmd: "Command Name", param: [param1, param2, param3, param4]}
        {cmd: "move to target", param: [0,0,60,0]}, // [x,y,duration,jump]
        {cmd: "move to", param: [0,0,60,0]},        // [x,y,duration,jump]
        {cmd: "slide", param: [0,0,60,0]},          // [x,y,duration,jump]
        {cmd: "return pos", param: []},             // Return to original position
        {cmd: "pose", param: [1,1,100]},            // [File Index, Frame Index, Wait duration]
        {cmd: "posemv", param: [0,1,100]},          // [Pose Index, Frame Index, Wait duration] (For MV)
        {cmd: "wait", param: [100]},                // [Frame wait]
        {cmd: "show anim", param: [100]},           // [Animation ID] (optional)
        {cmd: "cast", param: [100]},                // [Animation ID] (optional)
        {cmd: "add state", param: [1, 0.5]},        // [state id, (probability)]
        {cmd: "rem state", param: [1, 0.5]},        // [state id, (probability)]
        {cmd: "item apply", param: []},             // (no need parameters)
        {cmd: "item apply", param: [12]},           // [Integer = For specific skill ID]
        {cmd: "item apply", param: [0.5]},          // [Float = scale the damage]
        {cmd: "item apply", param: ["a.atk * 4"]},  // [String = change the formula]
        {cmd: "action", param:["Action Key"]},      // [Call other action key]
        {cmd: "change target", param:["mode"]},     // [mode = "random ally","self",etc ...]
        {cmd: "script", param: function(user, target){

        }}, // A valid JS code
        {cmd: "visible", param: [true]},            // Toggle visibility
        {cmd: "target move", param: [0,0,60,0]},    // Move target to 
        {cmd: "target slide", param: [0,0,60,0]},   // Slide target
        {cmd: "target reset", param: [0,0,60,0]},   // Reset target to original position
    ],
}

Sequencer.list['idle'] = {
    repeat: true,
    shuffle: true,
    sequence:[
        {cmd: 'posemv', param: [1, 0, 30]},
        {cmd: 'posemv', param: [1, 1, 5]},
        {cmd: 'posemv', param: [1, 2, 5]},
        {cmd: 'posemv', param: [1, 1, 5]},
    ]
}
